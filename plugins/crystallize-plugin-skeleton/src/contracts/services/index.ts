import type { PluginPayloadDecrypter } from '@crystallize/js-api-client';
import type { CrystallizeClientFactory } from './crystallize-client';
import type { PostInstallationHandler } from './post-installation-handler';

export * from './crystallize-client';
export * from './post-installation-handler';

export type Services = {
    payloadDecrypter: PluginPayloadDecrypter;
    createCrystallizeClient: CrystallizeClientFactory;
    postInstallationHandler: PostInstallationHandler;
};
