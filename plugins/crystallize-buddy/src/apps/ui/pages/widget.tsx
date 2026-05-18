import { useRequestContext } from 'hono/jsx-renderer';
import type { DecodedPayloadAppContext } from '@/contracts/app-context';
import { BuddyIsland } from '@/ui/islands/buddy-island';
import { palettes, type PaletteName } from '@/ui/components/character/palettes';
import { PluginLayout } from '../layouts/plugin-layout';

const isPaletteName = (value: unknown): value is PaletteName => typeof value === 'string' && value in palettes;

export async function Widget() {
    const c = useRequestContext<DecodedPayloadAppContext>();
    const tenantIdentifier = c.get('tenantIdentifier');
    const subscribeUrl = `/${tenantIdentifier}/api/sse/subscribe`;
    const configuration = (c.get('decodedPayload').envelope?.configuration ?? {}) as Record<string, unknown>;
    const palette: PaletteName = isPaletteName(configuration.color) ? configuration.color : 'orange';
    const crystallizeClient = c.get('crystallizeClient');
    const bCounts = await crystallizeClient.nextPimApi<{
        complete: { totalCount: number };
        error: { totalCount: number };
        pending: { totalCount: number };
        started: { totalCount: number };
    }>(QUERY_BULKTASK_COUNTS);

    const bulkTaskCounts = {
        complete: bCounts.complete.totalCount ?? 0,
        error: bCounts.error.totalCount ?? 0,
        pending: bCounts.pending.totalCount ?? 0,
        started: bCounts.started.totalCount ?? 0,
    };
    console.debug('[widget] initial bulk task counts:', bulkTaskCounts);
    return (
        <PluginLayout bare tenantIdentifier={tenantIdentifier} payload={c.get('rawPayload')}>
            <div className="flex min-h-0 flex-1 flex-col gap-3">
                <BuddyIsland
                    palette={palette}
                    subscribeUrl={subscribeUrl}
                    bulkTaskCounts={bulkTaskCounts}
                    tenantIdentifier={tenantIdentifier}
                    payload={c.get('rawPayload')}
                />
            </div>
        </PluginLayout>
    );
}

const QUERY_BULKTASK_COUNTS = `#graphql
query BULKTASK_COUNTS {
  complete: bulkTasks(filter: {status: complete}) {
    ... on BulkTaskConnection {
      totalCount
    }
  }
  error: bulkTasks(filter: {status: error}) {
    ... on BulkTaskConnection {
      totalCount
    }
  }
  pending: bulkTasks(filter: {status: pending}) {
    ... on BulkTaskConnection {
      totalCount
    }
  }
  started: bulkTasks(filter: {status: started}) {
    ... on BulkTaskConnection {
      totalCount
    }
  }
}`;
