import { createChannel, createWindowTransport, type Channel } from '@crystallize/plugin-signal';

let channel: Channel | null = null;

export function getPluginChannel(): Channel {
    if (!channel) {
        channel = createChannel({ transport: createWindowTransport() });
    }
    return channel;
}
