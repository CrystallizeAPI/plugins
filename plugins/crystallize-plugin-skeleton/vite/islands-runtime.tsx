import { jsx } from 'hono/jsx';
import type { JSX } from 'hono/jsx/jsx-runtime';
import { render as honoRender } from 'hono/jsx/dom';

type IslandRootProps<Props> = {
    id: string;
    props: Props;
    className?: string;
    islandKey?: string;
    propsId?: string;
    children: JSX.Element | JSX.Element[] | null;
};

export function IslandRoot<Props>({
    id,
    props,
    className,
    islandKey,
    propsId,
    children,
}: IslandRootProps<Props>): JSX.Element {
    if (typeof window !== 'undefined') {
        return <>{children}</>;
    }

    const htmlId = islandKey ? `${id}-${islandKey}` : id;
    const resolvedPropsId = propsId || `${id}-props${islandKey ? `-${islandKey}` : ''}`;

    return (
        <div
            id={htmlId}
            data-island={id}
            data-island-key={islandKey}
            data-props-id={resolvedPropsId}
            className={className}
        >
            {children}
            <script
                id={resolvedPropsId}
                type="application/json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(props) }}
            />
        </div>
    );
}

export type IslandRuntime = 'hono' | 'react';

type IslandComponent<Props = Record<string, unknown>> = (props: Props) => unknown;
type Entry = { component: IslandComponent<Record<string, unknown>>; runtime: IslandRuntime };

const registry: Record<string, Entry> = {};
const mounted = new Map<HTMLElement, () => void>();

export function registerIsland<Props>(
    name: string,
    component: IslandComponent<Props>,
    runtime: IslandRuntime = 'hono',
) {
    registry[name] = { component: component as IslandComponent<Record<string, unknown>>, runtime };
}

type QueryableRoot = Document | Element;

const mountHono = (entry: Entry, el: HTMLElement, props: Record<string, unknown>) => {
    el.replaceChildren();
    honoRender(jsx(entry.component as never, props), el);
    return () => honoRender(null, el);
};

const mountReact = async (entry: Entry, el: HTMLElement, props: Record<string, unknown>) => {
    const [react, reactDom] = await Promise.all([import('react'), import('react-dom/client')]);
    el.replaceChildren();
    const root = reactDom.createRoot(el);
    root.render(react.createElement(entry.component as never, props));
    return () => root.unmount();
};

const readProps = (el: HTMLElement, name: string): Record<string, unknown> => {
    const key = el.dataset.islandKey ? `-${el.dataset.islandKey}` : '';
    const propsId = el.dataset.propsId || `${name}-props${key}`;
    const propsEl = document.getElementById(propsId);
    if (!propsEl?.textContent) return {};
    try {
        return JSON.parse(propsEl.textContent) as Record<string, unknown>;
    } catch (error) {
        console.error(`Failed to parse props for island "${name}"`, error);
        return {};
    }
};

export const hydrateIslands = (root: QueryableRoot = document) => {
    const islands = Array.from(root.querySelectorAll<HTMLElement>('[data-island]'));
    for (const el of islands) {
        if (mounted.has(el)) continue;
        const name = el.dataset.island;
        if (!name) continue;
        const entry = registry[name];
        if (!entry) continue;

        const props = readProps(el, name);

        if (entry.runtime === 'react') {
            mountReact(entry, el, props).then((unmount) => {
                mounted.set(el, unmount);
            });
        } else {
            mounted.set(el, mountHono(entry, el, props));
        }
    }
};

export const rehydrateIslands = (root: QueryableRoot = document) => {
    mounted.forEach((unmount) => unmount());
    mounted.clear();
    hydrateIslands(root);
};
