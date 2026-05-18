import type { Child } from 'hono/jsx';

export type PromoteToDialogOption = boolean | { width?: number; height?: number };

export type PluginLinkProps = {
    action: string;
    payload: string;
    fields?: Record<string, string>;
    promoteToDialog?: PromoteToDialogOption;
    demoteFromDialog?: boolean;
    class?: string;
    loadingLabel?: string;
    ariaLabel?: string;
    children: Child;
};

export function PluginLink({
    action,
    payload,
    fields,
    promoteToDialog,
    demoteFromDialog,
    class: className,
    loadingLabel,
    ariaLabel,
    children,
}: PluginLinkProps) {
    const buttonAttrs: Record<string, string> = {};
    if (promoteToDialog) {
        buttonAttrs['data-channel-action'] = 'promote';
        if (typeof promoteToDialog === 'object') {
            if (typeof promoteToDialog.width === 'number') {
                buttonAttrs['data-channel-width'] = String(promoteToDialog.width);
            }
            if (typeof promoteToDialog.height === 'number') {
                buttonAttrs['data-channel-height'] = String(promoteToDialog.height);
            }
        }
    } else if (demoteFromDialog) {
        buttonAttrs['data-channel-action'] = 'demote';
    }
    if (ariaLabel) buttonAttrs['aria-label'] = ariaLabel;

    const formAttrs: Record<string, string> = {};
    if (loadingLabel) formAttrs['data-loader-label'] = loadingLabel;

    return (
        <form action={action} method="post" class="contents" {...formAttrs}>
            <input type="hidden" name="payload" value={payload} />
            {fields
                ? Object.entries(fields).map(([name, value]) => (
                      <input key={name} type="hidden" name={name} value={value} />
                  ))
                : null}
            <button type="submit" class={className} {...buttonAttrs}>
                {children}
            </button>
        </form>
    );
}
