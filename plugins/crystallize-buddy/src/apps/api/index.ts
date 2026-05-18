import { Context, Hono } from 'hono';
import type { DecodedPayloadAppContext, TenantBoundAppContext } from '@/contracts/app-context';
import { payloadDecrypter } from '@/core/middlewares/payload-decrypter';
import type { PostInstallationEvent } from '@/contracts/services/post-installation-handler';

const POST_INSTALL_EVENTS = new Set<PostInstallationEvent>(['install', 'reinstall', 'uninstall']);

export const createApiApp = () => {
    const api = new Hono<TenantBoundAppContext>();

    api.get('/sse/subscribe', (c) => {
        const channel = c.get('services').tenantSSEChannel(c.get('tenantIdentifier'));
        return channel.subscribe();
    });

    api.post('/sse/push', async (c) => {
        const payload = await c.req.json<{ event: string; [key: string]: unknown }>();
        const channel = c.get('services').tenantSSEChannel(c.get('tenantIdentifier'));
        return channel.push(payload);
    });

    api.post('/sse/close', (c) => {
        const channel = c.get('services').tenantSSEChannel(c.get('tenantIdentifier'));
        return channel.close();
    });

    api.post('/verify-passcode', payloadDecrypter, async (c: Context<DecodedPayloadAppContext>) => {
        const body = await c.req.parseBody<{ passcode?: string }>();
        const submitted = typeof body.passcode === 'string' ? body.passcode.trim() : '';
        const expected = c.get('decodedPayload').secrets?.passcode ?? '';
        const match = expected.length > 0 && submitted === expected;
        return c.json({ match, expected: match ? undefined : expected });
    });

    api.post('/doctor/webhooks', payloadDecrypter, async (c: Context<DecodedPayloadAppContext>) => {
        const result = await c.get('services').webhookManager.ensureMissing({
            crystallizeClient: c.get('crystallizeClient'),
            pluginIdentifier: c.env.PLUGIN_IDENTIFIER,
            pluginUrl: c.env.PLUGIN_URL,
            tenantIdentifier: c.get('tenantIdentifier'),
        });
        return c.json({ ok: true, created: result.created, checks: result.checks });
    });

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

    api.post('/webhook/receive', async (c) => {
        const tenantIdentifier = c.get('tenantIdentifier');
        const rawBody = await c.req.text();
        const signature = c.req.header('x-crystallize-signature') ?? null;
        const result = await c.get('services').webhookReceiver({
            rawBody,
            signature,
            url: c.req.url,
            method: c.req.method,
            expectedTenantIdentifier: tenantIdentifier,
        });
        if (!result.accepted) {
            return c.json({ ok: false, reason: result.reason }, 401);
        }
        return c.json({ ok: true });
    });
    return api;
};
