export type WebhookReceiverInput = {
    rawBody: string;
    signature: string | null;
    url: string;
    method: string;
    expectedTenantIdentifier: string;
};

export type WebhookReceiverResult = {
    accepted: boolean;
    reason?: string;
    pushed?: boolean;
};

export type WebhookReceiver = (input: WebhookReceiverInput) => Promise<WebhookReceiverResult>;
