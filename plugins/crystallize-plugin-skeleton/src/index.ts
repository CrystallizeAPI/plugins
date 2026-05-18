import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { createApp } from './app';
import { getConfig } from './config';

// Validate env at startup (throws here, not mid-request) and warm the cache.
const config = getConfig();

const app = createApp();

const root = new Hono();

// In production the client bundle + hashed assets are built to dist/client
// (vite-ssr-components `client` environment). vite-ssr-components' <Script>/
// <Link> resolve those to `/assets/*` (and `.css`) via the manifest, so the
// Node process must serve them. In dev, @hono/vite-dev-server +
// vite-ssr-components serve assets, so this block is prod-only.
if (import.meta.env.PROD) {
    root.use('/assets/*', serveStatic({ root: './dist/client' }));
}

root.route('/', app);

// In dev, @hono/vite-dev-server imports this module and serves the default
// export itself — it must NOT also bind a port here. In the production ssr
// bundle (import.meta.env.PROD), nothing else starts the server, so we do.
if (import.meta.env.PROD) {
    serve({ fetch: root.fetch, port: config.PORT }, (info) => {
        // eslint-disable-next-line no-console
        console.log(`Server listening on http://localhost:${info.port}`);
    });
}

export default root;
