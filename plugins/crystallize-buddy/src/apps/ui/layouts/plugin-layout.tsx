import type { JSX } from "hono/jsx/jsx-runtime";
import { PluginLink } from "@/ui/components/plugin-link";
import { PluginShellIsland } from "@/ui/islands/plugin-shell-island";

type PluginLayoutBase = {
    children: JSX.Element | JSX.Element[];
    headerActions?: JSX.Element | JSX.Element[];
};

type PluginLayoutProps =
    | (PluginLayoutBase & { bare: true; tenantIdentifier?: string; payload?: string })
    | (PluginLayoutBase & { bare?: false; tenantIdentifier: string; payload: string });

export function PluginLayout(props: PluginLayoutProps) {
    const { children, headerActions } = props;
    return (
        <div
            className={`flex min-h-screen w-full flex-col text-foreground ${props.bare ? "bg-transparent" : "bg-background"}`}
        >
            <PluginShellIsland />
            {!props.bare && (
                <header className="border-b border-border/60 bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
                    <div className="w-full px-[4%] py-3 flex items-center gap-2">
                        <PluginLink
                            action={`/${props.tenantIdentifier}/widget`}
                            payload={props.payload}
                            demoteFromDialog
                            loadingLabel="Opening Buddy…"
                            class="flex items-center gap-2 bg-transparent border-0 p-0 cursor-pointer text-foreground hover:opacity-80"
                        >
                            <img src="/logo.svg" alt="" width={20} height={29} className="h-6 w-auto" />
                            <span className="text-sm font-semibold tracking-tight">Crystallize Buddy</span>
                        </PluginLink>
                        {headerActions && <div className="ml-auto flex items-center gap-2">{headerActions}</div>}
                    </div>
                </header>
            )}
            <main className="flex w-full flex-1 flex-col px-[4%] py-[3%] text-sm">{children}</main>
        </div>
    );
}
