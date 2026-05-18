import { jsxRenderer } from 'hono/jsx-renderer';
import { Script, ViteClient } from 'vite-ssr-components/hono';
import style from '../../../ui/styles/global.css?inline';

// vite-ssr-components auto-detects prod via `import.meta.env.PROD`, but that
// define is not effective inside its code path in the Node ssr bundle. Our
// own `import.meta.env.PROD` IS effective (same bundle, our code), so drive
// dev/prod explicitly: skip the dev-only Vite client script in prod, and pass
// `prod` to <Script> so it resolves the hashed asset from the manifest.
const isProd = import.meta.env.PROD;

export const renderer = jsxRenderer(({ children }) => {
    return (
        <html lang={'en'}>
            <head>
                {isProd ? null : <ViteClient />}
                <Script src="/src/apps/ui/client.tsx" prod={isProd} defer />
                <meta charset="utf-8" />
                <style dangerouslySetInnerHTML={{ __html: style }} />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>Crystallize Plugin</title>
            </head>
            <body>
                <div id="app">{children}</div>
            </body>
        </html>
    );
});
