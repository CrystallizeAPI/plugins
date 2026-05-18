import { createPluginPayloadDecrypter } from '@crystallize/js-api-client';
import { asFunction, createContainer, InjectionMode } from 'awilix';
import type { Services } from '@/contracts/services';
import { createPostInstallationHandler } from './services/post-installation-handler';
import { createTenantSSEChannelFactory } from './services/tenant-sse-channel';
import { createWebhookReceiver } from './services/webhook-receiver';
import { createWebhookManager } from './services/webhook-manager';
import { createCrystallizeClient } from './services/crystallize-client-builder';

const build = (env: CloudflareBindings) => {
    return createContainer<Services>({
        injectionMode: InjectionMode.PROXY,
        strict: true,
    }).register({
        payloadDecrypter: asFunction(createPluginPayloadDecrypter)
            .inject(() => ({
                privateJwk: JSON.parse(env.PLUGIN_PRIVATE_JWK),
                verify: {
                    audience: env.PLUGIN_IDENTIFIER,
                    verifyBackendToken: env.ENVIRONMENT !== 'development',
                },
            }))
            .singleton(),
        tenantSSEChannel: asFunction(createTenantSSEChannelFactory)
            .inject(() => ({ env }))
            .singleton(),
        webhookReceiver: asFunction(createWebhookReceiver).singleton(),
        webhookManager: asFunction(createWebhookManager).singleton(),
        postInstallationHandler: asFunction(createPostInstallationHandler).singleton(),
        createCrystallizeClient: asFunction(createCrystallizeClient).singleton(),
    });
};

let container: ReturnType<typeof build> | null = null;
export const buildContainer = (_env: CloudflareBindings) => (container ??= build(_env));
