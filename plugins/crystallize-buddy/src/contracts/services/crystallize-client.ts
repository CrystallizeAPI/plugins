import type { ClientInterface, DecryptedPluginPayload } from "@crystallize/js-api-client";

export type CrystallizeClientFactory = (decodedPayload: DecryptedPluginPayload<unknown>) => ClientInterface;
