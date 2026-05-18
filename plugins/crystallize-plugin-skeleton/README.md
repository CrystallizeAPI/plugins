# crystallize-plugin-skeleton

Empty skeleton for building a Crystallize plugin on a Node.js server.

## Bootstrap

Use whichever package manager you prefer — `npm`, `pnpm`, or `bun`. The examples below use `npm`.

```bash
npm install
crystallize plugin keygen          # generates public.jwk.json + private.jwk.json
cp .env.dist .env                  # paste private JWK into PLUGIN_PRIVATE_JWK (single line)
cp dev-payload.config.jsonc.dist dev-payload.config.jsonc
npm run dev
```

## Commands

- `npm run dev` — local dev server (Vite + `@hono/vite-dev-server`, port 5173)
- `npm run build` — production build → `dist/index.js` (server) + `dist/client/` (hashed client assets + manifest)
- `npm run start` — run the production build (`node --env-file=.env dist/index.js`)
- `npm run codeclean` — `oxfmt --write . && oxlint --fix`

## Production

`npm run build` then `npm run start`. The server reads config from `.env`
(`PORT` defaults to 5173) and serves the built client assets from
`dist/client` itself — no separate static host required.
