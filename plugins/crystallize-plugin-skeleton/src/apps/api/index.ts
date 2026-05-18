import { Context, Hono } from 'hono';
import type { DecodedPayloadAppContext, TenantBoundAppContext } from '@/contracts/app-context';
import { payloadDecrypter } from '@/core/middlewares/payload-decrypter';
import type { PostInstallationEvent } from '@/contracts/services/post-installation-handler';

const POST_INSTALL_EVENTS = new Set<PostInstallationEvent>(['install', 'reinstall', 'uninstall']);

export const createApiApp = () => {
    const api = new Hono<TenantBoundAppContext>();

    api.post('/post-installation', payloadDecrypter, async (c: Context<DecodedPayloadAppContext>) => {
        const envelope = c.get('decodedPayload').envelope;
        const event = envelope?.event;
        if (!event || !POST_INSTALL_EVENTS.has(event as PostInstallationEvent)) {
            return c.text('invalid event', 400);
        }
        await c.get('services').postInstallationHandler({
            event: event as PostInstallationEvent,
            decodedPayload: c.get('decodedPayload'),
            pluginIdentifier: c.env.PLUGIN_IDENTIFIER,
            pluginUrl: c.env.PLUGIN_URL,
        });
        return c.text('ok');
    });

    return api;
};
