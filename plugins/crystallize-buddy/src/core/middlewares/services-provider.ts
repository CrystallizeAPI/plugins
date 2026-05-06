import { createMiddleware } from "hono/factory";
import { AppContext } from "@/contracts/app-context";
import { asValue } from "awilix";
import { buildContainer } from "@/core/container";
import { ExecutionContext } from "hono";

export const servicesProvider = createMiddleware<AppContext>(async (c, next) => {
    let executionContext: ExecutionContext | undefined;
    try {
        executionContext = c.executionCtx;
    } catch {
        executionContext = undefined;
    }
    const defer = async (promise: Promise<void>) => {
        if (executionContext) {
            executionContext.waitUntil(promise);
        } else {
            await promise;
        }
    };

    const container = buildContainer(c.env);
    const scoped = container.createScope().register({
        defer: asValue(defer),
    });

    c.set("services", {
        payloadDecrypter: scoped.cradle.payloadDecrypter,
        tenantSSEChannel: scoped.cradle.tenantSSEChannel,
        webhookReceiver: scoped.cradle.webhookReceiver,
        webhookManager: scoped.cradle.webhookManager,
        postInstallationHandler: scoped.cradle.postInstallationHandler,
        createCrystallizeClient: scoped.cradle.createCrystallizeClient,
    });

    await next();
});
