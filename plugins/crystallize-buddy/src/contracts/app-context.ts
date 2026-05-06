import type { Services } from "@/contracts/services";
import { ClientInterface, DecryptedPluginPayload } from "@crystallize/js-api-client";

export type AppContext = {
    Bindings: CloudflareBindings;
    Variables: {
        services: Services;
    };
};

export type TenantBoundAppContext = Omit<AppContext, "Variables"> & {
    Variables: AppContext["Variables"] & {
        tenantIdentifier: string;
    };
};

export type DecodedPayloadAppContext = Omit<AppContext, "Variables"> & {
    Variables: TenantBoundAppContext["Variables"] & {
        decodedPayload: DecryptedPluginPayload<unknown>;
        crystallizeClient: ClientInterface;
        rawPayload: string;
    };
};
