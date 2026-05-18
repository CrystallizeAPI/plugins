import type { DecryptedPluginPayload } from '@crystallize/js-api-client';

export type PostInstallationEvent = 'install' | 'reinstall' | 'uninstall';

export type PostInstallationHandlerInput = {
    decodedPayload: DecryptedPluginPayload<unknown>;
    pluginIdentifier: string;
    pluginUrl: string;
    event: PostInstallationEvent;
};

export type PostInstallationHandlerResult =
    | { handled: true; deleted: number }
    | { handled: true; created: number; alreadyPresent: number };

export type PostInstallationHandler = (input: PostInstallationHandlerInput) => Promise<PostInstallationHandlerResult>;
