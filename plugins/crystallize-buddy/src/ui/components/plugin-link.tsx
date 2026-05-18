import type { JSX } from 'hono/jsx/jsx-runtime';

export type PromoteToDialogOption = boolean | { width?: number; height?: number };

export type PluginLinkProps = {
    action: string;
    payload: string;
    promoteToDialog?: PromoteToDialogOption;
    demoteFromDialog?: boolean;
    class?: string;
    loadingLabel?: string;
    children: JSX.Element | JSX.Element[] | string;
};

export function PluginLink({
    action,
    payload,
    promoteToDialog,
    demoteFromDialog,
    class: className,
    loadingLabel,
    children,
}: PluginLinkProps) {
    const dataAttrs: Record<string, string> = {};
    if (promoteToDialog) {
        dataAttrs['data-channel-action'] = 'promote';
        if (typeof promoteToDialog === 'object') {
            if (typeof promoteToDialog.width === 'number') {
                dataAttrs['data-channel-width'] = String(promoteToDialog.width);
            }
            if (typeof promoteToDialog.height === 'number') {
                dataAttrs['data-channel-height'] = String(promoteToDialog.height);
            }
        }
    } else if (demoteFromDialog) {
        dataAttrs['data-channel-action'] = 'demote';
    }
    if (loadingLabel && dataAttrs['data-channel-action']) {
        dataAttrs['data-channel-loading-label'] = loadingLabel;
    }

    return (
        <form action={action} method="post" class="contents">
            <input type="hidden" name="payload" value={payload} />
            <button type="submit" class={className} {...dataAttrs}>
                {children}
            </button>
        </form>
    );
}
