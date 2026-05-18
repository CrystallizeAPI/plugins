import { useRequestContext } from 'hono/jsx-renderer';
import type { DecodedPayloadAppContext } from '@/contracts/app-context';
import { DoctorIsland } from '@/ui/islands/doctor-island';
import { PluginLink } from '@/ui/components/plugin-link';
import { PluginLayout } from '../layouts/plugin-layout';

export async function Doctor() {
    const c = useRequestContext<DecodedPayloadAppContext>();
    const tenantIdentifier = c.get('tenantIdentifier');
    const services = c.get('services');

    const inspection = await services.webhookManager.inspect({
        crystallizeClient: c.get('crystallizeClient'),
        pluginIdentifier: c.env.PLUGIN_IDENTIFIER,
        pluginUrl: c.env.PLUGIN_URL,
        tenantIdentifier,
    });

    const { checks, webhookUrl } = inspection;
    const missingCount = checks.filter((check) => !check.present).length;
    const allOk = missingCount === 0;

    return (
        <PluginLayout
            tenantIdentifier={tenantIdentifier}
            payload={c.get('rawPayload')}
            headerActions={
                <PluginLink
                    action={`/${tenantIdentifier}/widget`}
                    payload={c.get('rawPayload')}
                    demoteFromDialog
                    loadingLabel="Closing…"
                    class="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors bg-transparent border-0 p-0 cursor-pointer"
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="size-4"
                        aria-hidden="true"
                    >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                    </svg>
                </PluginLink>
            }
        >
            <div class="flex flex-col gap-4">
                <div>
                    <h1 class="text-base font-semibold">Plugin Doctor</h1>
                    <p class="text-xs text-muted-foreground">
                        Verify the Crystallize configuration for this plugin to run great.
                    </p>
                </div>

                {allOk ? (
                    <div class="flex items-start gap-2 rounded-lg border border-emerald-600/60 bg-emerald-500/15 p-3 text-emerald-800">
                        <CheckIcon class="size-4 mt-0.5 shrink-0" />
                        <div class="flex flex-col gap-0.5">
                            <span class="text-sm font-medium">Everything looks good</span>
                            <span class="text-xs opacity-80">All {checks.length} managed webhooks are configured.</span>
                        </div>
                    </div>
                ) : (
                    <div class="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-destructive">
                        <WarningIcon class="size-4 mt-0.5 shrink-0" />
                        <div class="flex flex-col gap-0.5">
                            <span class="text-sm font-medium">
                                {missingCount} webhook{missingCount === 1 ? '' : 's'} missing
                            </span>
                            <span class="text-xs opacity-80">
                                Crystallize Buddy needs every managed webhook to keep up with tenant changes.
                            </span>
                        </div>
                    </div>
                )}

                <div class="rounded-lg border border-border/60 bg-background/40 p-3">
                    <h2 class="text-sm font-semibold mb-2">Managed webhooks</h2>
                    <ul class="flex flex-col divide-y divide-border/60">
                        {checks.map((check) => (
                            <li key={`${check.concern}-${check.event}`} class="flex items-center justify-between py-2">
                                <span class="text-sm font-medium">
                                    {check.concern} / {check.event}
                                </span>
                                {check.present ? (
                                    <span class="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-xs text-foreground/80">
                                        <CheckIcon class="size-3" /> Configured
                                    </span>
                                ) : (
                                    <span class="inline-flex items-center gap-1 rounded-full bg-destructive px-2 py-0.5 text-xs text-destructive-foreground">
                                        <WarningIcon class="size-3" /> Missing
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>

                <p class="text-xs text-muted-foreground">
                    Webhook target: <code class="text-foreground">{webhookUrl}</code>
                </p>

                {!allOk && (
                    <DoctorIsland
                        fixUrl={`/${tenantIdentifier}/api/doctor/webhooks`}
                        payload={c.get('rawPayload')}
                        missingCount={missingCount}
                    />
                )}
            </div>
        </PluginLayout>
    );
}

function CheckIcon({ class: className }: { class?: string }) {
    return (
        <svg
            class={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <path d="M20 6L9 17l-5-5" />
        </svg>
    );
}

function WarningIcon({ class: className }: { class?: string }) {
    return (
        <svg
            class={className}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    );
}
