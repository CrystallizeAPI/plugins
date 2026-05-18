import { ClientConfiguration, ClientInterface, createClient, DecryptedPluginPayload } from '@crystallize/js-api-client';
import type { CrystallizeClientFactory } from '@/contracts/services/crystallize-client';

const DEV_BACKEND_TOKEN_PREFIX = 'dev-payload://';

// `dev-payload://accessTokenId:abc,accessTokenSecret:xyz` → { accessTokenId, accessTokenSecret }.
// Anything else → null. Comma-separated `key:value` pairs; only the first `:`
// in each pair separates key from value, so token strings can contain colons.
const parseDevBackendToken = (
    backendToken: string,
): Pick<ClientConfiguration, 'accessTokenId' | 'accessTokenSecret'> | null => {
    if (!backendToken.startsWith(DEV_BACKEND_TOKEN_PREFIX)) return null;
    const rest = backendToken.slice(DEV_BACKEND_TOKEN_PREFIX.length);
    const out: Record<string, string> = {};
    for (const pair of rest.split(',')) {
        if (!pair) continue;
        const idx = pair.indexOf(':');
        if (idx === -1) continue;
        const key = pair.slice(0, idx).trim();
        const value = pair.slice(idx + 1).trim();
        if (key) out[key] = value;
    }
    return {
        accessTokenId: out.accessTokenId,
        accessTokenSecret: out.accessTokenSecret,
    };
};

export const createCrystallizeClient =
    (): CrystallizeClientFactory =>
    (decodedPayload: DecryptedPluginPayload<unknown>): ClientInterface => {
        const envelope = decodedPayload.envelope;
        if (!envelope) throw new Error('cannot build crystallize client without an envelope');

        const devCredentials = parseDevBackendToken(envelope.backendToken);
        const config: ClientConfiguration = devCredentials
            ? {
                  tenantIdentifier: envelope.tenantIdentifier,
                  tenantId: envelope.tenantId,
                  accessTokenId: devCredentials.accessTokenId,
                  accessTokenSecret: devCredentials.accessTokenSecret,
              }
            : {
                  tenantIdentifier: envelope.tenantIdentifier,
                  tenantId: envelope.tenantId,
                  bearerToken: envelope.backendToken,
              };

        return createClient(config, {
            profiling: {
                onRequest: () => {},
                onRequestResolved: ({ resolutionTimeMs, serverTimeMs }, q) => {
                    console.log(`[CRYSTALLIZE] Resolved in ${resolutionTimeMs}ms (server time: ${serverTimeMs}ms)`, q);
                },
            },
        });
    };
