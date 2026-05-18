import type { PluginPayloadDecrypter } from '@crystallize/js-api-client';
import type { CrystallizeClientFactory } from './crystallize-client';
import type { PostInstallationHandler } from './post-installation-handler';
import type { TenantSSEChannelFactory } from './tenant-sse-channel';
import type { WebhookManager } from './webhook-manager';
import type { WebhookReceiver } from './webhook-receiver';

export * from './crystallize-client';
export * from './post-installation-handler';
export * from './tenant-sse-channel';
export * from './webhook-manager';
export * from './webhook-receiver';

export type Services = {
    payloadDecrypter: PluginPayloadDecrypter;
    tenantSSEChannel: TenantSSEChannelFactory;
    webhookReceiver: WebhookReceiver;
    webhookManager: WebhookManager;
    postInstallationHandler: PostInstallationHandler;
    createCrystallizeClient: CrystallizeClientFactory;
};
