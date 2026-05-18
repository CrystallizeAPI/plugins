import { PluginLayout } from '../layouts/plugin-layout';

export function Home() {
    return (
        <PluginLayout bare>
            <section class="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 py-16 text-center">
                <h1 class="text-4xl font-semibold tracking-tight text-foreground">Crystallize Plugin Skeleton</h1>
                <p class="max-w-md text-base text-muted-foreground">
                    Replace this page with your plugin's marketing / install entry.
                </p>
            </section>
        </PluginLayout>
    );
}
