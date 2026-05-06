import { jsxRenderer } from "hono/jsx-renderer";
import { Script, ViteClient } from "vite-ssr-components/hono";
import style from "../../../ui/styles/global.css?inline";
export const renderer = jsxRenderer(({ children }) => {
    return (
        <html lang={"en"}>
            <head>
                <ViteClient />
                <Script src="/src/apps/ui/client.tsx" defer />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;600;700;800&display=swap"
                    rel="stylesheet"
                    media="print"
                    // @ts-expect-error: this is a valid event handler in DOM but TS might complain about string assignment
                    onLoad="this.media='all'"
                />
                <noscript>
                    <link
                        href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;600;700;800&display=swap"
                        rel="stylesheet"
                    />
                </noscript>
                <meta charset="utf-8" />
                <style dangerouslySetInnerHTML={{ __html: style }} />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>Crystallize Buddy</title>
            </head>
            <body>
                <div id="app">{children}</div>
            </body>
        </html>
    );
});
