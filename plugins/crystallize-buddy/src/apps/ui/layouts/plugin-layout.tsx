import type { JSX } from "hono/jsx/jsx-runtime";

type PluginLayoutProps = {
    children: JSX.Element | JSX.Element[];
    bare?: boolean;
};

export function PluginLayout({ children, bare = false }: PluginLayoutProps) {
    return (
        <div
            className={`flex min-h-screen w-full flex-col text-foreground ${bare ? "bg-transparent" : "bg-background"}`}
        >
            {!bare && (
                <header className="border-b border-border/60 bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
                    <div className="w-full px-[4%] py-3 flex items-center gap-2">
                        <img src="/logo.svg" alt="" width={20} height={29} className="h-6 w-auto" />
                        <span className="text-sm font-semibold tracking-tight">Crystallize Buddy</span>
                    </div>
                </header>
            )}
            <main className="flex w-full flex-1 flex-col px-[4%] py-[3%] text-sm">{children}</main>
        </div>
    );
}
