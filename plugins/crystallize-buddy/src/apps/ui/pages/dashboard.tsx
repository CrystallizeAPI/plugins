import { useRequestContext } from 'hono/jsx-renderer';
import type { DecodedPayloadAppContext } from '@/contracts/app-context';
import { DashboardIsland } from '@/ui/islands/dashboard-island';
import { palettes, type PaletteName } from '@/ui/components/character/palettes';
import { PluginLayout } from '../layouts/plugin-layout';

const isPaletteName = (value: unknown): value is PaletteName => typeof value === 'string' && value in palettes;

export function Dashboard() {
    const c = useRequestContext<DecodedPayloadAppContext>();
    const tenantIdentifier = c.get('tenantIdentifier');
    const configuration = (c.get('decodedPayload').envelope?.configuration ?? {}) as Record<string, unknown>;
    const palette: PaletteName = isPaletteName(configuration.color) ? configuration.color : 'orange';

    return (
        <PluginLayout bare>
            <DashboardIsland
                palette={palette}
                payload={c.get('rawPayload')}
                verifyUrl={`/${tenantIdentifier}/api/verify-passcode`}
            />
        </PluginLayout>
    );
}
