# crystallize-buddy

## Stack

- Cloudflare Workers + Hono framework
- Hono JSX SSR (`jsxImportSource: "hono/jsx"`), `react-dom/client` for island hydration
- React 19 (inside islands only), Tailwind v4, ShadCN (radix-nova style, `src/ui/components/ui/`)
- Awilix DI (PROXY mode), Kysely + kysely-d1, Zod, TypeScript (ESNext/Bundler)
- Vite + `@cloudflare/vite-plugin`, bun as package manager

## Commands

- `bun dev` — local dev server
- `bun run build` / `bun run deploy` — build / build + wrangler deploy
- `bun run cf-typegen` — regen `CloudflareBindings` into `worker-configuration.d.ts` after editing `wrangler.jsonc` bindings
- `bun run codeclean`

## UI

- Pages SSR'd with **Hono JSX** (`jsxImportSource: "hono/jsx"`), not React. Client interactivity via islands; the boundary is a DOM element, not a function call — Hono SSRs `<div data-island="…">` placeholders (`src/apps/ui/core/islands.tsx` — Hono JSX, no React imports), then `react-dom/client` `createRoot` mounts a React tree on top of each one (`src/apps/ui/core/islands-runtime.ts` — client-only). The split keeps react/react-dom out of the SSR bundle.
- Why the split: Hono JSX and React are different runtimes (different `jsx()` outputs, no shared dispatcher/reconciler). React libraries (Radix, ShadCN, lucide-react) need React running. Keeping React strictly inside islands means SSR pages stay light and the worker bundle doesn't pull React-only deps. **Web Components (no React) work directly in Hono JSX pages with no island needed.**
- Islands auto-discovered by Vite plugin (`vite/islands.ts`) — see "UI islands" below.

### UI islands (`src/ui/islands/`)

Auto-discovered by Vite plugin. Subdirs OK.

**Shell** — `xxx-island.tsx` (Hono JSX). Exports `XxxIslandId` (string) and `XxxIsland` (component) which renders `<IslandRoot id={XxxIslandId} props={…}>{children}</IslandRoot>`. The children are SSR'd as static HTML and stay in the DOM. **Must not import React libraries.**

**Optional React client body** — `xxx-island-client.tsx` (React JSX, `/** @jsxImportSource react */` at top). Exports `XxxIslandClient` — a React component. The Vite plugin pairs it with the shell by filename and registers it under the shell's `XxxIslandId`; on hydration `react-dom/client` `createRoot` wipes the SSR'd children and renders the React tree in their place. Free to import full React libraries (Radix, ShadCN, lucide-react).

If no `-island-client.tsx` is present, the shell SSRs as static HTML and no client code runs for that island. Use this when you only need server-rendered content (e.g. a `<canvas>` or other plain DOM that doesn't need a React tree).

Props must be JSON-serializable (server → client via embedded `<script type="application/json">`).
