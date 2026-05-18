import { createPluginPayloadDecrypter } from '@crystallize/js-api-client';
import { asFunction, createContainer, InjectionMode } from 'awilix';
import type { Services } from '@/contracts/services';
import type { Config } from '@/config';
import { createCrystallizeClientFactory } from './services/crystallize-client-builder';
import { createPostInstallationHandler } from './services/post-installation-handler';

const build = (config: Config) => {
    return createContainer<Services>({
        injectionMode: InjectionMode.PROXY,
        strict: true,
    }).register({
        payloadDecrypter: asFunction(createPluginPayloadDecrypter)
            .inject(() => ({
                privateJwk: JSON.parse(config.PLUGIN_PRIVATE_JWK),
                verify: {
                    audience: config.PLUGIN_IDENTIFIER,
                    verifyBackendToken: config.ENVIRONMENT !== 'development',
                },
            }))
            .singleton(),
        createCrystallizeClient: asFunction(createCrystallizeClientFactory).singleton(),
        postInstallationHandler: asFunction(createPostInstallationHandler).singleton(),
    });
};

let container: ReturnType<typeof build> | null = null;
export const buildContainer = (config: Config) => (container ??= build(config));
