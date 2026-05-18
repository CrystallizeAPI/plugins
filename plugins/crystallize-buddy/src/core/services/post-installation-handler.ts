import type { CrystallizeClientFactory } from '@/contracts/services/crystallize-client';
import type {
    PostInstallationHandler,
    PostInstallationHandlerInput,
} from '@/contracts/services/post-installation-handler';
import type { WebhookManager } from '@/contracts/services/webhook-manager';

type Deps = {
    createCrystallizeClient: CrystallizeClientFactory;
    webhookManager: WebhookManager;
};

export const createPostInstallationHandler =
    ({ createCrystallizeClient, webhookManager }: Deps): PostInstallationHandler =>
    async (input: PostInstallationHandlerInput) => {
        const { event, pluginIdentifier, pluginUrl } = input;
        const tenantIdentifier = input.decodedPayload.envelope?.tenantIdentifier;
        if (!tenantIdentifier) {
            throw new Error('missing tenantIdentifier in decoded payload envelope');
        }
        const crystallizeClient = createCrystallizeClient(input.decodedPayload);

        if (event === 'uninstall') {
            const { removed } = await webhookManager.removeAll({
                crystallizeClient,
                pluginIdentifier,
            });
            return { handled: true, deleted: removed };
        }

        const { created, checks } = await webhookManager.ensureMissing({
            crystallizeClient,
            pluginIdentifier,
            pluginUrl,
            tenantIdentifier,
        });

        return {
            handled: true,
            created,
            alreadyPresent: checks.length - created,
        };
    };
