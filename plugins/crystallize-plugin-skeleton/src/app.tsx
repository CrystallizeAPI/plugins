import { type Context, Hono } from 'hono';
import { logger } from 'hono/logger';
import { trimTrailingSlash } from 'hono/trailing-slash';
import { AppContext } from './contracts/app-context';
import { createUIApp } from './apps/ui';
import { createApiApp } from './apps/api';
import { servicesProvider } from './core/middlewares/services-provider';
import { tenantIdentifierProvider } from './core/middlewares/tenant-identifier-provider';
import { renderer } from './apps/ui/core/renderer';
import { Home } from './apps/ui/pages/home';
import { NotFound } from './apps/ui/pages/not-found';

export const createApp = () => {
    const app = new Hono<AppContext>();
    app.use(logger());
    app.use(trimTrailingSlash());
    app.onError((err, c) => {
        console.error(`[ERROR] ${c.req.method} ${c.req.path}:`, err.message, err.stack);
        return c.text('Internal Server Error', 500);
    });
    app.use(servicesProvider);
    app.get('/health', (c) => c.text('ok'));
    app.get('/', renderer, (c) => c.render(<Home />));

    const tenantBoundedApp = new Hono<AppContext>();
    tenantBoundedApp.use('*', tenantIdentifierProvider);
    tenantBoundedApp.route('/:tenantIdentifier', createUIApp());
    tenantBoundedApp.route('/:tenantIdentifier/api', createApiApp());

    app.route('/', tenantBoundedApp);

    const notFoundHandler = (c: Context<AppContext>) => {
        c.status(404);
        return c.render(<NotFound />);
    };
    app.notFound(notFoundHandler);
    return app;
};
