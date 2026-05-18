import { useRef, useState } from 'hono/jsx';
import { IslandRoot } from 'virtual:islands/runtime';
import { CrystalCharacter, type CrystalAction, type CrystalApi } from '../components/character/character';

export const HomeIslandId = 'home-island';

const ACTIONS: { action: CrystalAction; label: string }[] = [
    { action: 'jump', label: 'Jump' },
    { action: 'spin', label: 'Spin' },
    { action: 'shine', label: 'Shine' },
    { action: 'dance', label: 'Dance' },
];

const buildInstallUrl = (tenant: string) => `https://app.crystallize.com/@${tenant}/en/marketplace/crystallize-buddy`;

export function HomeIsland() {
    const apiRef = useRef<CrystalApi | null>(null);
    const trigger = (action: CrystalAction) => () => apiRef.current?.[action]();

    const [tenant, setTenant] = useState('');
    const cleanTenant = tenant.trim().replace(/^@+/, '');
    const enabled = cleanTenant.length > 0;
    const href = enabled ? buildInstallUrl(cleanTenant) : '#';

    return (
        <IslandRoot id={HomeIslandId} props={{}}>
            <section class="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-10 py-16 text-center">
                <div class="flex flex-col items-center gap-6">
                    <CrystalCharacter size={200} apiRef={apiRef} palette="orange" />
                    <nav class="flex flex-wrap justify-center gap-2">
                        {ACTIONS.map(({ action, label }) => (
                            <button
                                key={action}
                                type="button"
                                onClick={trigger(action)}
                                class="inline-flex h-9 items-center justify-center rounded-full border border-border/70 bg-background/80 px-4 text-[13px] font-medium text-foreground/80 backdrop-blur transition hover:border-foreground/30 hover:text-foreground"
                            >
                                {label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div class="flex flex-col items-center gap-3">
                    <h1 class="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">Crystallize Buddy</h1>
                    <p class="max-w-md text-base text-muted-foreground">
                        The Crystallize Buddy is a plugin demo that you can put on your tenant.
                    </p>
                </div>

                <div class="flex w-full max-w-sm flex-col items-stretch gap-3">
                    <label class="relative flex items-center">
                        <span
                            aria-hidden="true"
                            class="pointer-events-none absolute left-4 text-base text-muted-foreground"
                        >
                            @
                        </span>
                        <input
                            type="text"
                            value={tenant}
                            onInput={(event) => setTenant((event.currentTarget as HTMLInputElement).value)}
                            placeholder="your-tenant"
                            spellcheck={false}
                            autocapitalize="off"
                            autocorrect="off"
                            class="h-12 w-full rounded-full border border-border bg-background pl-9 pr-4 text-center text-base text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-foreground/40 focus:ring-2 focus:ring-foreground/10"
                        />
                    </label>

                    <a
                        href={href}
                        target={enabled ? '_blank' : undefined}
                        rel="noreferrer"
                        aria-disabled={!enabled}
                        tabIndex={enabled ? 0 : -1}
                        onClick={(event: MouseEvent) => {
                            if (!enabled) event.preventDefault();
                        }}
                        class={`inline-flex h-12 items-center justify-center rounded-full bg-foreground px-8 text-[15px] font-medium text-background shadow-sm transition ${
                            enabled ? 'hover:opacity-90 active:translate-y-px' : 'pointer-events-none opacity-40'
                        }`}
                    >
                        Install on your tenant
                        <span aria-hidden="true" class="ml-2">
                            →
                        </span>
                    </a>

                    <p class="min-h-4 text-[11px] text-muted-foreground/80 break-all">
                        {enabled ? href : 'Type your tenant identifier to enable install.'}
                    </p>
                </div>
            </section>
        </IslandRoot>
    );
}
