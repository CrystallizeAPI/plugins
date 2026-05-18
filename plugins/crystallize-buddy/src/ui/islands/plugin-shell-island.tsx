import { useEffect } from 'hono/jsx';
import { IslandRoot } from 'virtual:islands/runtime';
import { getPluginChannel } from '../lib/plugin-channel';

export const PluginShellIslandId = 'plugin-shell-island';

const LOADER_ID = 'plugin-shell-loader';

function showLoader(label: string | null) {
    if (document.getElementById(LOADER_ID)) return;
    const overlay = document.createElement('div');
    overlay.id = LOADER_ID;
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    overlay.className =
        'fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm';
    const spinner = document.createElement('span');
    spinner.className =
        'inline-block size-8 animate-spin rounded-full border-2 border-current border-r-transparent text-foreground';
    spinner.setAttribute('aria-hidden', 'true');
    overlay.appendChild(spinner);
    if (label) {
        const text = document.createElement('span');
        text.className = 'text-sm text-muted-foreground';
        text.textContent = label;
        overlay.appendChild(text);
    }
    document.body.appendChild(overlay);
}

function parseDim(raw: string | undefined): number | undefined {
    if (!raw) return undefined;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function PluginShellIsland() {
    useEffect(() => {
        const channel = getPluginChannel();
        const onClick = (event: MouseEvent) => {
            const target = event.target;
            if (!(target instanceof Element)) return;
            const trigger = target.closest<HTMLElement>('[data-channel-action]');
            if (!trigger) return;
            const action = trigger.dataset.channelAction;
            if (action === 'promote') {
                const dims: { width?: number; height?: number } = {};
                const width = parseDim(trigger.dataset.channelWidth);
                const height = parseDim(trigger.dataset.channelHeight);
                if (width !== undefined) dims.width = width;
                if (height !== undefined) dims.height = height;
                channel.notify('promoteToDialog', dims);
            } else if (action === 'demote') {
                channel.notify('demoteFromDialog', undefined);
            } else {
                return;
            }
            showLoader(trigger.dataset.channelLoadingLabel ?? null);
        };
        document.addEventListener('click', onClick, true);
        return () => document.removeEventListener('click', onClick, true);
    }, []);

    return (
        <IslandRoot id={PluginShellIslandId} props={{}}>
            {null}
        </IslandRoot>
    );
}
