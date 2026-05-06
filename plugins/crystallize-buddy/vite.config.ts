import path from "node:path";
import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig, type PluginOption } from "vite";
import ssrPlugin from "vite-ssr-components/plugin";
import { devPayloadPlugin } from "./vite/dev-payload";
import { islandsPlugin } from "./vite/islands";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
    if (mode === "client")
        return {
            esbuild: {
                jsxImportSource: "hono/jsx/dom",
            },
            build: {
                chunkSizeWarningLimit: 2000,
                rollupOptions: {
                    input: "./src/apps/ui/client.tsx",
                    output: {
                        entryFileNames: "static/client.js",
                    },
                },
            },
        };

    return {
        resolve: {
            alias: {
                "@": path.resolve(__dirname, "./src"),
            },
        },
        build: {
            chunkSizeWarningLimit: 2000,
        },
        plugins: [devPayloadPlugin(), cloudflare(), ssrPlugin(), tailwindcss() as PluginOption, islandsPlugin()],
    };
});
