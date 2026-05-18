import type {
    PostInstallationHandler,
    PostInstallationHandlerInput,
} from '@/contracts/services/post-installation-handler';

export const createPostInstallationHandler =
    (): PostInstallationHandler => async (_input: PostInstallationHandlerInput) => {
        // Stub. Plug your install / reinstall / uninstall side-effects here
        // (e.g. webhook provisioning, tenant bootstrap, cleanup).
        return { handled: true };
    };
