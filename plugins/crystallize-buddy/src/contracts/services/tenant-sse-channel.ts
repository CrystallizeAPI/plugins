export type TenantInstallationState = {
    configuration: Record<string, unknown>;
    signatureSecret: string | null;
    updatedAt: number;
};

export type TenantSSEChannel = {
    subscribe(): Promise<Response>;
    push(payload: { event: string; [key: string]: unknown }): Promise<Response>;
    close(): Promise<Response>;
    saveInstallationState(
        state: Pick<TenantInstallationState, 'configuration' | 'signatureSecret'>,
    ): Promise<TenantInstallationState>;
    getInstallationState(): Promise<TenantInstallationState | null>;
};

export type TenantSSEChannelFactory = (tenantIdentifier: string) => TenantSSEChannel;
