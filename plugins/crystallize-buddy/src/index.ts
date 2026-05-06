import { createApp } from "./app";

export { TenantSSEChannel } from "./core/durable-objects/tenant-sse-channel";

const app = createApp();

export default {
    fetch: app.fetch,
};
