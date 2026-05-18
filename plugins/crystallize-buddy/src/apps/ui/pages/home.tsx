import { HomeIsland } from '@/ui/islands/home-island';
import { PluginLayout } from '../layouts/plugin-layout';

export function Home() {
    return (
        <PluginLayout bare>
            <HomeIsland />
        </PluginLayout>
    );
}
