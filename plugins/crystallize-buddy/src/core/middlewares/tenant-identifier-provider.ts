import { TenantBoundAppContext } from '@/contracts/app-context';
import { createMiddleware } from 'hono/factory';

export const tenantIdentifierProvider = createMiddleware<TenantBoundAppContext>(async (c, next) => {
    const parts = c.req.path.split('/');
    if (!parts[1]) {
        return c.text('missing tenant', 400);
    }
    const tenantIdentifier = parts[1].startsWith('@') ? parts[1].substring(1) : parts[1];
    if (!tenantIdentifier || tenantIdentifier.length === 0 || tenantIdentifier.includes('.')) {
        return c.text('invalid tenant', 400);
    }
    c.set('tenantIdentifier', tenantIdentifier);
    await next();
});
