import fs from 'node:fs';
import path from 'node:path';
import { CompactEncrypt, importJWK, UnsecuredJWT } from 'jose';
import { type Plugin } from 'vite';

type RouteConfig = {
    pathPattern: string;
    envelope?: Record<string, unknown>;
    secrets?: Record<string, string>;
};

type DevPayloadConfig = {
    routes: RouteConfig[];
};

// Strip // line and /* block */ comments + trailing commas, preserving string literals.
// Vite's plugin runtime can be Node (shebang) even under `bun dev`, so we don't rely on Bun.JSON5.
const parseJsonc = (input: string): unknown => {
    const noComments = input.replace(/"(?:[^"\\]|\\.)*"|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (m) =>
        m.startsWith('"') ? m : '',
    );
    return JSON.parse(noComments.replace(/,(\s*[}\]])/g, '$1'));
};

type Match = {
    route: RouteConfig;
    tenantIdentifier: string;
};

const matchRoute = (urlPath: string, cfg: DevPayloadConfig): Match | null => {
    for (const route of cfg.routes) {
        const re = new RegExp('^' + route.pathPattern.replace(/:([^/]+)/g, '(?<$1>[^/]+)') + '/?$');
        const m = urlPath.match(re);
        const tenantIdentifier = m?.groups?.tenant;
        if (m && tenantIdentifier) return { route, tenantIdentifier };
    }
    return null;
};

const encryptSecret = async (key: Awaited<ReturnType<typeof importJWK>>, plaintext: string): Promise<string> =>
    await new CompactEncrypt(new TextEncoder().encode(plaintext))
        .setProtectedHeader({ alg: 'RSA-OAEP-256', enc: 'A256GCM' })
        .encrypt(key);

// `.dev.vars` is consumed by `@cloudflare/vite-plugin` for the worker runtime
// only — it does NOT propagate into the Node host's `process.env` where this
// Vite plugin executes. Parse it ourselves so populate-mode env overrides
// (CRYSTALLIZE_TENANT_ID, etc.) actually reach the minting code.
const loadDevVars = (filePath: string): Record<string, string> => {
    if (!fs.existsSync(filePath)) return {};
    const out: Record<string, string> = {};
    for (const rawLine of fs.readFileSync(filePath, 'utf-8').split('\n')) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const eq = line.indexOf('=');
        if (eq === -1) continue;
        const key = line.slice(0, eq).trim();
        let value = line.slice(eq + 1).trim();
        if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
            value = value.slice(1, -1);
        }
        if (key) out[key] = value;
    }
    return out;
};

// Build the dev-payload backendToken. The `dev-payload://` prefix is the
// signal — to both the worker's payload-decrypter and the crystallize client
// builder — that this envelope was minted locally. Dev API credentials
// (accessTokenId/accessTokenSecret from `.dev.vars`) ride along inside the
// token so the client builder can use them without reading env at request time.
const buildDevBackendToken = (accessTokenId?: string, accessTokenSecret?: string): string => {
    const parts: string[] = [];
    if (accessTokenId) parts.push(`accessTokenId:${accessTokenId}`);
    if (accessTokenSecret) parts.push(`accessTokenSecret:${accessTokenSecret}`);
    return `dev-payload://${parts.join(',')}`;
};

const mintPayload = async (
    publicJwk: object,
    m: Match,
    pluginIdentifier: string,
    extras: {
        tenantId?: string;
        signatureSecret?: string;
        staticAuthToken?: string;
        accessTokenId?: string;
        accessTokenSecret?: string;
    } = {},
): Promise<string> => {
    const key = await importJWK(publicJwk as never, 'RSA-OAEP-256');

    // Per-field JWE-encrypt the configured secrets so the decrypter resolves
    // them into `decoded.secrets` on the receiving end (same path as prod).
    const encryptedSecrets: Record<string, string> = {};
    for (const [field, plaintext] of Object.entries(m.route.secrets ?? {})) {
        encryptedSecrets[field] = await encryptSecret(key, plaintext);
    }

    // `signatureSecret` (webhook HMAC) and `staticAuthToken` (Discovery bearer)
    // ride at the top of the envelope in prod — not inside encryptedSecrets.
    // Mirror that here so the worker reads them off `decoded.envelope.*`
    // identically in dev and prod.
    const envelope = {
        tenantIdentifier: m.tenantIdentifier,
        ...(extras.tenantId ? { tenantId: extras.tenantId } : {}),
        installationId: 'dev-installation',
        pluginIdentifier,
        revisionId: 'dev-revision',
        configuration: {},
        backendToken: buildDevBackendToken(extras.accessTokenId, extras.accessTokenSecret),
        ...(extras.signatureSecret ? { signatureSecret: extras.signatureSecret } : {}),
        ...(extras.staticAuthToken ? { staticAuthToken: extras.staticAuthToken } : {}),
        ...m.route.envelope,
        // JWE-wrapped secrets win over any envelope override so they decrypt cleanly.
        encryptedSecrets,
    };

    // The decrypter only populates `envelope` when the outer JWE has cty=JWT
    // and the plaintext is a compact JWS. We can't sign with Crystallize's key,
    // so we use an unsecured JWT — jose's decodeJwt fallback path populates
    // envelopeClaims even when signature verification fails. The worker's
    // payload-decrypter middleware accepts this because the `dev-payload://`
    // backendToken prefix flags the envelope as locally minted.
    const innerJws = new UnsecuredJWT(envelope).setIssuedAt().setAudience(pluginIdentifier).encode();
    return await new CompactEncrypt(new TextEncoder().encode(innerJws))
        .setProtectedHeader({ alg: 'RSA-OAEP-256', enc: 'A256GCM', cty: 'JWT' })
        .encrypt(key);
};

export function devPayloadPlugin(): Plugin {
    return {
        name: 'vite-plugin-dev-payload',
        apply: 'serve',
        configureServer(server) {
            const root = process.cwd();
            const cfgPath = path.resolve(root, 'dev-payload.config.jsonc');
            const publicKeyPath = path.resolve(root, 'public.jwk.json');
            const devVarsPath = path.resolve(root, '.dev.vars');

            // Re-read `.dev.vars` per request so editing it doesn't require a
            // dev-server restart. Real `process.env` still wins (so a shell
            // export overrides the file).
            const readEnv = (key: string): string | undefined => {
                const fromShell = process.env[key]?.trim();
                if (fromShell) return fromShell;
                const fromFile = loadDevVars(devVarsPath)[key]?.trim();
                return fromFile || undefined;
            };

            const RECURSION_HEADER = 'x-dev-payload-injected';

            server.middlewares.use(async (req, res, next) => {
                // Recursion guard: our own sub-request must pass through.
                if (req.headers[RECURSION_HEADER]) return next();
                if (req.method !== 'GET' || !req.url) return next();

                const [urlPath, queryString] = req.url.split('?');
                const queryPayload = new URLSearchParams(queryString ?? '').get('payload');

                // Two GET sources need proxying to POST:
                //   1. `?payload=<jwe>` — pasted into the browser URL.
                //   2. A path matching a `dev-payload.config.jsonc` route — we
                //      mint a fresh dev JWE from that config.
                // The Hono app only ever speaks POST; this plugin is the bridge.
                let jwe: string;
                let logSuffix: string;
                let effectiveUrlPath = urlPath;
                if (queryPayload) {
                    jwe = queryPayload;
                    logSuffix = 'passthrough';
                } else {
                    if (!fs.existsSync(cfgPath) || !fs.existsSync(publicKeyPath)) return next();

                    let cfg: DevPayloadConfig;
                    let publicJwk: object;
                    try {
                        cfg = parseJsonc(fs.readFileSync(cfgPath, 'utf-8')) as DevPayloadConfig;
                        publicJwk = JSON.parse(fs.readFileSync(publicKeyPath, 'utf-8'));
                    } catch (err) {
                        server.config.logger.warn(`[dev-payload] config read failed: ${(err as Error).message}`);
                        return next();
                    }

                    const match = matchRoute(urlPath, cfg);
                    if (!match) return next();

                    // Populate-mode env overrides: let local dev set tenant identity once
                    // in `.dev.vars` instead of typing it into every URL or config file.
                    // Override `:tenant` for both the minted envelope AND the proxied
                    // sub-request URL — the worker's payload-decrypter rejects mismatches
                    // between path tenant and envelope tenant, so they must move together.
                    const envTenantIdentifier = readEnv('CRYSTALLIZE_TENANT_IDENTIFIER');
                    const envTenantId = readEnv('CRYSTALLIZE_TENANT_ID');
                    if (envTenantIdentifier && envTenantIdentifier !== match.tenantIdentifier) {
                        effectiveUrlPath = urlPath.replace(`/${match.tenantIdentifier}`, `/${envTenantIdentifier}`);
                        match.tenantIdentifier = envTenantIdentifier;
                    }

                    // Mirror prod: in production these ride as top-level envelope
                    // fields (`signatureSecret`, `staticAuthToken`). In dev we
                    // source them from `.dev.vars` so the worker reads them off
                    // `decoded.envelope.*` exactly the same way in either env.
                    const envSignatureSecret = readEnv('CRYSTALLIZE_SIGNING_SECRET');
                    const envStaticAuthToken = readEnv('CRYSTALLIZE_STATIC_AUTH_TOKEN');
                    const envAccessTokenId = readEnv('CRYSTALLIZE_ACCESS_TOKEN_ID');
                    const envAccessTokenSecret = readEnv('CRYSTALLIZE_ACCESS_TOKEN_SECRET');

                    const pluginIdentifier = readEnv('PLUGIN_IDENTIFIER') ?? 'com.crystallize.plugin.buddy';
                    try {
                        jwe = await mintPayload(publicJwk, match, pluginIdentifier, {
                            tenantId: envTenantId,
                            signatureSecret: envSignatureSecret,
                            staticAuthToken: envStaticAuthToken,
                            accessTokenId: envAccessTokenId,
                            accessTokenSecret: envAccessTokenSecret,
                        });
                    } catch (err) {
                        server.config.logger.error(`[dev-payload] mint failed: ${(err as Error).message}`);
                        return next();
                    }
                    logSuffix = `tenant=${match.tenantIdentifier}${envTenantId ? ` id=${envTenantId}` : ''}`;
                }

                const host = req.headers.host;
                if (!host) return next();
                // Drop the query string from the proxied URL — payload now travels in the body.
                const subUrl = `http://${host}${effectiveUrlPath}`;
                server.config.logger.info(`[dev-payload] ${urlPath} → POST (${logSuffix})`);

                let subResp: Response;
                try {
                    subResp = await fetch(subUrl, {
                        method: 'POST',
                        headers: {
                            'content-type': 'application/x-www-form-urlencoded',
                            [RECURSION_HEADER]: '1',
                        },
                        body: `payload=${encodeURIComponent(jwe)}`,
                    });
                } catch (err) {
                    server.config.logger.error(`[dev-payload] sub-request failed: ${(err as Error).message}`);
                    res.statusCode = 502;
                    res.end('dev-payload sub-request failed');
                    return;
                }

                res.statusCode = subResp.status;
                subResp.headers.forEach((value, key) => {
                    const k = key.toLowerCase();
                    // Drop hop-by-hop / re-encoded headers Node will set itself.
                    if (k === 'content-encoding' || k === 'transfer-encoding' || k === 'content-length') return;
                    res.setHeader(key, value);
                });

                if (subResp.body) {
                    const reader = subResp.body.getReader();
                    try {
                        for (;;) {
                            const { done, value } = await reader.read();
                            if (done) break;
                            res.write(Buffer.from(value));
                        }
                    } finally {
                        reader.releaseLock();
                    }
                }
                res.end();
            });
        },
    };
}
