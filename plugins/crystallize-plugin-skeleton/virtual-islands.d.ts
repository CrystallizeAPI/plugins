declare module 'virtual:islands' {
    export type IslandRuntime = 'hono' | 'react';
    export function registerAllIslands(
        register: <Props>(name: string, component: (props: Props) => unknown, runtime?: IslandRuntime) => void,
    ): void;
}

declare module 'virtual:islands/runtime' {
    import type { JSX } from 'hono/jsx/jsx-runtime';

    export type IslandRuntime = 'hono' | 'react';

    export function IslandRoot<Props>(props: {
        id: string;
        props: Props;
        className?: string;
        islandKey?: string;
        propsId?: string;
        children: JSX.Element | JSX.Element[] | null;
    }): JSX.Element;

    export function registerIsland<Props>(
        name: string,
        component: (props: Props) => unknown,
        runtime?: IslandRuntime,
    ): void;

    export function hydrateIslands(root?: Document | Element): void;
    export function rehydrateIslands(root?: Document | Element): void;
}
