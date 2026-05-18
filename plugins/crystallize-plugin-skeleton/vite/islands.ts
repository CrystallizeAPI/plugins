import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Plugin, normalizePath } from 'vite';

const currentDirname = path.dirname(fileURLToPath(import.meta.url));

type IslandRuntime = 'hono' | 'react';

type IslandEntry = {
    id: string;
    clientName: string;
    clientPath: string;
    runtime: IslandRuntime;
};

const SHELL_SUFFIX = '-island.tsx';
const CLIENT_SUFFIX = '-island-client.tsx';
const REACT_PRAGMA_RE = /\/\*\*\s*@jsxImportSource\s+react\s*\*\//;

export function islandsPlugin(): Plugin {
    const virtualModuleId = 'virtual:islands';
    const resolvedVirtualModuleId = '\0' + virtualModuleId + '.js';
    const runtimeVirtualId = 'virtual:islands/runtime';
    const runtimePath = normalizePath(path.resolve(currentDirname, 'islands-runtime.tsx'));
    const islandsDir = path.resolve(process.cwd(), 'src/ui/islands');

    function getIslands(): IslandEntry[] {
        if (!fs.existsSync(islandsDir)) return [];

        const entries: IslandEntry[] = [];

        const walk = (dir: string) => {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    walk(fullPath);
                    continue;
                }
                // Only seed from shell files. `*-island-client.tsx` does NOT
                // satisfy endsWith("-island.tsx") so it is naturally skipped.
                if (!file.endsWith(SHELL_SUFFIX)) continue;

                const shellContent = fs.readFileSync(fullPath, 'utf-8');
                const idMatch = shellContent.match(
                    /export\s+const\s+([A-Z][a-zA-Z0-9]*IslandId)\s*=\s*["']([^"']+)["']/,
                );
                if (!idMatch) continue;
                const id = idMatch[2];

                const clientPath = fullPath.replace(/-island\.tsx$/, CLIENT_SUFFIX);
                if (fs.existsSync(clientPath)) {
                    const clientContent = fs.readFileSync(clientPath, 'utf-8');
                    const clientMatch = clientContent.match(
                        /export\s+(?:function|const)\s+([A-Z][a-zA-Z0-9]*IslandClient)\b/,
                    );
                    if (!clientMatch) continue;

                    const runtime: IslandRuntime = REACT_PRAGMA_RE.test(clientContent) ? 'react' : 'hono';

                    entries.push({
                        id,
                        clientName: clientMatch[1],
                        clientPath: normalizePath(clientPath),
                        runtime,
                    });
                    continue;
                }

                // No -island-client.tsx → hydrate the shell's XxxIsland export with Hono runtime.
                // IslandRoot collapses to a fragment on the client, so mounting the shell into
                // the existing [data-island] el doesn't re-emit a wrapper.
                const shellMatch = shellContent.match(
                    /export\s+(?:function|const)\s+([A-Z][a-zA-Z0-9]*Island)\b(?!Id\b)(?!Body\b)(?!Client\b)/,
                );
                if (!shellMatch) continue;

                entries.push({
                    id,
                    clientName: shellMatch[1],
                    clientPath: normalizePath(fullPath),
                    runtime: 'hono',
                });
            }
        };

        walk(islandsDir);
        return entries.sort((a, b) => a.id.localeCompare(b.id));
    }

    return {
        name: 'vite-plugin-hono-islands',
        resolveId(id) {
            if (id === virtualModuleId) {
                return resolvedVirtualModuleId;
            }
            if (id === runtimeVirtualId) {
                return runtimePath;
            }
        },
        load(id) {
            if (id === resolvedVirtualModuleId) {
                const islands = getIslands();

                const imports = islands.map((i) => `import { ${i.clientName} } from "${i.clientPath}";`).join('\n');

                const registrations = islands
                    .map(
                        (i) =>
                            `  registerIsland(${JSON.stringify(i.id)}, ${i.clientName}, ${JSON.stringify(i.runtime)});`,
                    )
                    .join('\n');

                return `
import { registerIsland as _registerIsland, rehydrateIslands } from "${runtimeVirtualId}";
${imports}

export function registerAllIslands(registerIsland) {
${registrations}
}

if (import.meta.hot) {
  import.meta.hot.accept((mod) => {
    if (mod) {
      mod.registerAllIslands(_registerIsland);
      rehydrateIslands();
    }
  });
}
`;
            }
        },
        configureServer(server) {
            server.watcher.add(islandsDir);
            const isRelevant = (file: string) =>
                file.startsWith(islandsDir) && (file.endsWith(SHELL_SUFFIX) || file.endsWith(CLIENT_SUFFIX));
            const invalidate = () => {
                const mod = server.moduleGraph.getModuleById(resolvedVirtualModuleId);
                if (mod) {
                    server.moduleGraph.invalidateModule(mod);
                }
            };
            server.watcher.on('add', (file) => {
                if (isRelevant(file)) invalidate();
            });
            server.watcher.on('unlink', (file) => {
                if (isRelevant(file)) invalidate();
            });
        },
    };
}
