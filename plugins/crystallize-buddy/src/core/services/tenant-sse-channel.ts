import type { TenantInstallationState, TenantSSEChannelFactory } from "@/contracts/services/tenant-sse-channel";

export const createTenantSSEChannelFactory = ({ env }: { env: CloudflareBindings }): TenantSSEChannelFactory => {
    return (tenantIdentifier: string) => {
        const id = env.TENANT_SSE_CHANNEL.idFromName(tenantIdentifier);
        const stub = env.TENANT_SSE_CHANNEL.get(id);
        return {
            subscribe: () => stub.fetch(new Request("https://do/subscribe")),
            push: (payload) =>
                stub.fetch(
                    new Request("https://do/push", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                    }),
                ),
            close: () => stub.fetch(new Request("https://do/close", { method: "POST" })),
            saveInstallationState: async (state) => {
                const res = await stub.fetch(
                    new Request("https://do/state", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(state),
                    }),
                );
                return res.json<TenantInstallationState>();
            },
            getInstallationState: async () => {
                const res = await stub.fetch(new Request("https://do/state"));
                if (res.status === 404) return null;
                return res.json<TenantInstallationState>();
            },
        };
    };
};
