import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, loadEnv, type PluginOption } from 'vite';
import devServer from '@hono/vite-dev-server';
import ssrPlugin from 'vite-ssr-components/plugin';
import { devPayloadPlugin } from './vite/dev-payload';
import { islandsPlugin } from './vite/islands';
import tailwindcss from '@tailwindcss/vite';

function gitCommitFromCli(): string | null {
    try {
        return execSync('git rev-parse HEAD').toString().trim() || null;
    } catch {
        return null;
    }
}

const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf8')) as { version: string };
const gitCommit = process.env.GITHUB_SHA ?? gitCommitFromCli() ?? 'unknown';

export default defineConfig(({ mode }) => {
    // Vite only exposes VITE_-prefixed vars to client code; server code reads
    // process.env. In prod `node --env-file=.env` handles this. In dev the
    // vite process must hydrate process.env from .env itself, or getConfig()
    // throws when @hono/vite-dev-server imports src/index.ts.
    const fileEnv = loadEnv(mode, process.cwd(), '');
    for (const [k, v] of Object.entries(fileEnv)) {
        if (process.env[k] === undefined) process.env[k] = v;
    }

    return {
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
        build: {
            chunkSizeWarningLimit: 2000,
        },
        // vite-ssr-components must be bundled (not externalized) into the ssr
        // output, or its `import.meta.env` access runs untransformed from
        // node_modules (undefined → crash) and injectManifest/define never
        // apply to it.
        ssr: {
            noExternal: ['vite-ssr-components'],
        },
        define: {
            __GIT_COMMIT__: JSON.stringify(gitCommit),
            __APP_VERSION__: JSON.stringify(pkg.version),
            // vite-ssr-components' loadManifest() reads
            // `import.meta.env.VITE_MANIFEST_CONTENT` first. Vite does not
            // materialize an `import.meta.env` object in the Node ssr bundle,
            // so that access throws before the injectManifest fallback runs.
            // Fold it to `undefined` so loadManifest skips to the fallback
            // (the `__VITE_MANIFEST_CONTENT__` placeholder injectManifest
            // replaces with the real client manifest).
            'import.meta.env.VITE_MANIFEST_CONTENT': 'undefined',
        },
        // vite-ssr-components drives the multi-environment build:
        // clientFirstBuild builds `client` (→ dist/client + manifest) first,
        // then `ssr`; injectManifest inlines dist/client/.vite/manifest.json
        // into the ssr bundle so <Script>/<Link> resolve hashed assets in prod.
        environments: {
            client: {
                build: {
                    outDir: 'dist/client',
                    manifest: true,
                },
            },
            ssr: {
                build: {
                    // Bundle the Node entry. emptyOutDir:false so building ssr
                    // (→ dist/) does not wipe the client build (→ dist/client).
                    ssr: true,
                    outDir: 'dist',
                    emptyOutDir: false,
                    rollupOptions: {
                        input: './src/index.ts',
                        output: {
                            entryFileNames: 'index.js',
                        },
                    },
                },
            },
        },
        plugins: [
            devPayloadPlugin(),
            devServer({ entry: 'src/index.ts' }),
            ssrPlugin(),
            tailwindcss() as PluginOption,
            islandsPlugin(),
        ],
    };
});
