import type { ClientInterface } from '@crystallize/js-api-client';

export type ManagedConcern = 'orders' | 'items' | 'customers';
export type ManagedEvent = 'create' | 'update' | 'delete';

export type WebhookCheck = {
    concern: ManagedConcern;
    event: ManagedEvent;
    present: boolean;
    id: string | null;
};

export type WebhookManagerInput = {
    crystallizeClient: ClientInterface;
    pluginIdentifier: string;
    pluginUrl: string;
    tenantIdentifier: string;
};

export type WebhookManagerInspection = {
    webhookUrl: string;
    checks: WebhookCheck[];
};

export type WebhookManager = {
    inspect(input: WebhookManagerInput): Promise<WebhookManagerInspection>;
    ensureMissing(input: WebhookManagerInput): Promise<WebhookManagerInspection & { created: number }>;
    removeAll(input: Omit<WebhookManagerInput, 'tenantIdentifier' | 'pluginUrl'>): Promise<{ removed: number }>;
};
