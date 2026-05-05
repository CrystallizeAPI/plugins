import { Hono } from 'hono';
import { renderDashboard } from './page.ts';
import { createClient, createPluginPayloadDecrypter } from '@crystallize/js-api-client';

const decrypter = createPluginPayloadDecrypter({
    privateJwk: JSON.parse(`${process.env.PLUGIN_PRIVATE_JWK}`),
    verify: {
        audience: `${process.env.PLUGIN_IDENTIFIER}`,
        verifyBackendToken: true,
    },
});

const app = new Hono();
app.post('/:tenantIdentifier/post-install', async (c) => {
    const tenantIdentifier = c.req.param('tenantIdentifier');
    try {
        const payload = await c.req.text();
        const decoded = await decrypter(payload);
        if (decoded.envelope?.tenantIdentifier !== tenantIdentifier) {
            return c.text('tenant mismatch', 403);
        }
        console.log({ decoded });
        return c.text('ok');
    } catch (err) {
        return c.text('bad payload', 400);
    }
});

app.post('/:tenantIdentifier/endpoint', async (c) => {
    const tenantIdentifier = c.req.param('tenantIdentifier');
    try {
        const body = await c.req.parseBody();
        if (typeof body !== 'object' || body === null || typeof body.payload !== 'string') {
            return c.text('invalid body', 400);
        }
        const payload = body.payload;
        const decoded = await decrypter(payload);
        if (decoded.envelope?.tenantIdentifier !== tenantIdentifier) {
            return c.text('tenant mismatch', 403);
        }
        const client = createClient({
            tenantIdentifier: tenantIdentifier,
            bearerToken: `${decoded.envelope.backendToken}`,
        });
        const data = await client.nextPimApi<{ tenant: { id: string; name: string } }>(
            '{ tenant { ...on Tenant { id name } } }',
        );
        console.log({ decoded, data });
        return c.html(renderDashboard(decoded, data));
    } catch (err) {
        console.error('Error handling request:', err);
        return c.text('bad payload', 400);
    }
});

const port = 3000;
console.log(`Hello World plugin running at http://localhost:${port}`);

export default {
    port,
    fetch: app.fetch,
};
