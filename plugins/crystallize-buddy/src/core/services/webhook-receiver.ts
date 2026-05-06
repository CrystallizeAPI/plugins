import { createSignatureVerifier } from "@crystallize/js-api-client";
import type { TenantSSEChannelFactory } from "@/contracts/services/tenant-sse-channel";
import type { WebhookReceiver } from "@/contracts/services/webhook-receiver";

type Deps = {
    tenantSSEChannel: TenantSSEChannelFactory;
};
export const createWebhookReceiver =
    ({ tenantSSEChannel }: Deps): WebhookReceiver =>
    async (input) => {
        const state = await tenantSSEChannel(input.expectedTenantIdentifier).getInstallationState();
        const signatureSecret = state?.signatureSecret ?? null;
        if (signatureSecret) {
            if (!input.signature) {
                return { accepted: false, reason: "missing signature header" };
            }
            const verify = createSignatureVerifier({ secret: signatureSecret });
            try {
                const sig = await verify(input.signature, {
                    url: input.url,
                    method: input.method,
                    body: input.rawBody,
                });
                if (sig.tenantIdentifier !== input.expectedTenantIdentifier) {
                    return { accepted: false, reason: "tenant mismatch" };
                }
            } catch (err) {
                return {
                    accepted: false,
                    reason: `signature verification failed: ${(err as Error).message}`,
                };
            }
        } else {
            console.warn(
                `[webhook-receiver] no secret configured; accepting webhook for ${input.expectedTenantIdentifier} without verification`,
            );
        }

        let payload: unknown;
        try {
            payload = JSON.parse(input.rawBody);
        } catch {
            payload = input.rawBody;
        }

        const url = new URL(input.url);
        const concern = url.searchParams.get("concern");
        const action = url.searchParams.get("event");

        const channel = tenantSSEChannel(input.expectedTenantIdentifier);
        await channel.push({ event: "action", concern, action, payload });
        return { accepted: true, pushed: true };
    };
