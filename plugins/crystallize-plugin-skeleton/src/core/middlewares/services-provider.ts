import { createMiddleware } from 'hono/factory';
import { AppContext } from '@/contracts/app-context';
import { buildContainer } from '@/core/container';
import { getConfig } from '@/config';

export const servicesProvider = createMiddleware<AppContext>(async (c, next) => {
    const container = buildContainer(getConfig());
    const scoped = container.createScope();

    c.set('services', {
        payloadDecrypter: scoped.cradle.payloadDecrypter,
        createCrystallizeClient: scoped.cradle.createCrystallizeClient,
        postInstallationHandler: scoped.cradle.postInstallationHandler,
    });

    await next();
});
