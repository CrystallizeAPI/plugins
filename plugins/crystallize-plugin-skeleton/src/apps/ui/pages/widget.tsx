import { useRequestContext } from 'hono/jsx-renderer';
import type { DecodedPayloadAppContext } from '@/contracts/app-context';
import { PluginLayout } from '../layouts/plugin-layout';

export function Widget() {
    const c = useRequestContext<DecodedPayloadAppContext>();
    const tenantIdentifier = c.get('tenantIdentifier');
    return (
        <PluginLayout bare>
            <section class="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                <h1 class="text-2xl font-semibold">Hello, {tenantIdentifier}</h1>
                <p class="text-sm text-muted-foreground">
                    This is the plugin widget. Replace it with your placement UI.
                </p>
            </section>
        </PluginLayout>
    );
}
