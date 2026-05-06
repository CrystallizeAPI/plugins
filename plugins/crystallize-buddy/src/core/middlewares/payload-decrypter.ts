import { createMiddleware } from "hono/factory";
import { DecodedPayloadAppContext } from "@/contracts/app-context";

// Sentinel prefix minted by `vite/dev-payload.ts`. Its presence on the
// envelope's backendToken is the signal that the payload came from the local
// dev path (locally-encrypted, unsigned) — never `c.env.ENVIRONMENT`. The dev
// access-token credentials ride inside the token after the prefix; the
// crystallize client builder is the only place that parses them out.
const DEV_BACKEND_TOKEN_PREFIX = "dev-payload://";

export const payloadDecrypter = createMiddleware<DecodedPayloadAppContext>(async (c, next) => {
    const tenantIdentifier = c.get("tenantIdentifier");
    if (!tenantIdentifier) return c.text("missing tenant", 400);

    // Crystallize sends iframe entrypoints as `payload=<JWE>` and the
    // post-installation webhook as `encryptedPayload=<JWE>` (both form-encoded).
    const body = await c.req.parseBody<{ payload?: string; encryptedPayload?: string }>();
    if (!body || typeof body === "string") return c.text("invalid body", 400);
    const jwe = typeof body.payload === "string" ? body.payload : body.encryptedPayload;
    if (typeof jwe !== "string" || !jwe) return c.text("missing payload", 400);

    const decoded = await c.get("services").payloadDecrypter(jwe);

    const envelope = decoded.envelope;
    if (!envelope) return c.text("invalid envelope", 403);
    if (envelope.tenantIdentifier !== tenantIdentifier) {
        return c.text("tenant mismatch", 403);
    }
    const isDevPayload = envelope.backendToken.startsWith(DEV_BACKEND_TOKEN_PREFIX);
    if (!isDevPayload && decoded.signatureStatus.verified !== true) {
        return c.text("invalid signature", 403);
    }

    c.set("decodedPayload", decoded);
    c.set("rawPayload", jwe);
    c.set("crystallizeClient", c.get("services").createCrystallizeClient(decoded));

    // Persist the long-lived envelope bits (config + webhook signing secret)
    // so async webhook calls — which arrive without a payload — can look them up.
    await c
        .get("services")
        .tenantSSEChannel(tenantIdentifier)
        .saveInstallationState({
            configuration: (envelope.configuration as Record<string, unknown>) ?? {},
            signatureSecret: envelope.signatureSecret ?? null,
        });

    await next();
});
