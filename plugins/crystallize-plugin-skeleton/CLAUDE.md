# crystallize-plugin-skeleton

## Stack

- Node.js server (Hono served via `@hono/node-server`); the Hono app is runtime-agnostic (`app.fetch`)
- Hono JSX SSR (`jsxImportSource: "hono/jsx"`), `react-dom/client` for island hydration
- React 19 (inside islands only), Tailwind v4, ShadCN (radix-nova style, `src/ui/components/ui/`)
- Awilix DI (PROXY mode), Zod, TypeScript (ESNext/Bundler)
- Vite: `@hono/vite-dev-server` (dev) + `vite-ssr-components` drives the prod build (client → `dist/client` + manifest, then ssr → `dist/index.js`); works with any package manager (`npm`, `pnpm`, or `bun`)
- Config from `process.env` via `src/config.ts` (`getConfig()`, Zod-validated, read once at startup); local `.env` loaded by Node `--env-file` in prod and hydrated into `process.env` by `vite.config.ts` (`loadEnv`) in dev
- `@crystallize/js-api-client` for plugin payload decryption + Crystallize API client
- `@crystallize/plugin-signal` for iframe ↔ host channel (promote/demote dialog, etc.)

## Commands

- `npm run dev` — local dev server (port 5173)
- `npm run build` — production build → `dist/index.js` + `dist/client/`
- `npm run start` — run the production build (`node --env-file=.env dist/index.js`)
- `npm run codeclean` — `oxfmt --write . && oxlint --fix`

## Build notes

- `vite-ssr-components` owns the multi-environment build (`clientFirstBuild` → client to `dist/client`, then ssr; `injectManifest` inlines the client manifest into the ssr bundle). It must be bundled, not externalized — `vite.config.ts` sets `ssr.noExternal: ["vite-ssr-components"]`, or its `import.meta.env` access runs untransformed and crashes.
- `import.meta.env.PROD` is only constant-folded in our own code, not in dependency code, in the Node ssr bundle. `src/apps/ui/core/renderer.tsx` therefore drives dev/prod explicitly (skips `<ViteClient/>` in prod, passes `prod` to `<Script>`). `vite.config.ts` folds `import.meta.env.VITE_MANIFEST_CONTENT` → `undefined` so `loadManifest()` reaches the injected fallback.
- `src/index.ts` calls `@hono/node-server`'s `serve()` only under `import.meta.env.PROD` (so dev's `@hono/vite-dev-server` owns the dev server) and serves `dist/client` assets via `serveStatic` in prod. Port from `config.PORT` (`.env`, default 5173).

## UI

- Pages SSR'd with **Hono JSX** (`jsxImportSource: "hono/jsx"`), not React. Client interactivity via islands; the boundary is a DOM element, not a function call — Hono SSRs `<div data-island="…">` placeholders, then `react-dom/client` `createRoot` mounts a React tree on top of each one (`vite/islands-runtime.tsx` — client-only). The split keeps react/react-dom out of the SSR bundle.
- Why the split: Hono JSX and React are different runtimes (different `jsx()` outputs, no shared dispatcher/reconciler). React libraries (Radix, ShadCN, lucide-react) need React running. Keeping React strictly inside islands means SSR pages stay light and the server bundle doesn't pull React-only deps. **Web Components (no React) work directly in Hono JSX pages with no island needed.**
- Islands auto-discovered by Vite plugin (`vite/islands.ts`) — see "UI islands" below.

### UI islands (`src/ui/islands/`)

Auto-discovered by Vite plugin. Subdirs OK.

**Shell** — `xxx-island.tsx` (Hono JSX). Exports `XxxIslandId` (string) and `XxxIsland` (component) which renders `<IslandRoot id={XxxIslandId} props={…}>{children}</IslandRoot>`. The children are SSR'd as static HTML and stay in the DOM. **Must not import React libraries.**

**Optional React client body** — `xxx-island-client.tsx` (React JSX, `/** @jsxImportSource react */` at top). Exports `XxxIslandClient` — a React component. The Vite plugin pairs it with the shell by filename and registers it under the shell's `XxxIslandId`; on hydration `react-dom/client` `createRoot` wipes the SSR'd children and renders the React tree in their place. Free to import full React libraries (Radix, ShadCN, lucide-react).

If no `-island-client.tsx` is present, the shell SSRs as static HTML and no client code runs for that island. Use this when you only need server-rendered content (e.g. a `<canvas>` or other plain DOM that doesn't need a React tree).

Props must be JSON-serializable (server → client via embedded `<script type="application/json">`).

## Plugin payload flow

- Crystallize loads the plugin iframe with a JWE `payload` (entrypoints) or `encryptedPayload` (post-install webhook), both form-encoded over POST.
- `src/core/middlewares/payload-decrypter.ts` decrypts via `@crystallize/js-api-client`'s `createPluginPayloadDecrypter` (wired in `src/core/container.ts`), validates the path tenant matches the envelope, and stashes the decoded payload + a ready-to-use `crystallizeClient` on the request context.
- Locally, `vite/dev-payload.ts` mints fake JWEs from `dev-payload.config.jsonc` so browsers can hit GET URLs and the server still sees a real-shape POST payload. The minted backendToken carries a `dev-payload://` sentinel; both the decrypter (skips signature check) and the client builder (uses access-token creds from `.env`) detect it.
