import type { JSX } from 'hono/jsx/jsx-runtime';
import { PluginShellIsland } from '@/ui/islands/plugin-shell-island';

type PluginLayoutProps = {
    children: JSX.Element | JSX.Element[];
    bare?: boolean;
};

export function PluginLayout({ children, bare }: PluginLayoutProps) {
    return (
        <div
            className={`flex min-h-screen w-full flex-col text-foreground ${bare ? 'bg-transparent' : 'bg-background'}`}
        >
            <PluginShellIsland />
            <main className="flex w-full flex-1 flex-col px-[4%] py-[3%] text-sm">{children}</main>
        </div>
    );
}
