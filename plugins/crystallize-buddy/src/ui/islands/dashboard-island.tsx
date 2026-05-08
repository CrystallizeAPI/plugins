import { useRef, useState, useEffect } from "hono/jsx";
import { IslandRoot } from "virtual:islands/runtime";
import { CrystalCharacter, type CrystalAction, type CrystalApi } from "../components/character/character";
import type { PaletteName } from "../components/character/palettes";
import { createChannel, createWindowTransport } from '@crystallize/plugin-signal';

export const DashboardIslandId = "dashboard-island";

export type DashboardIslandProps = {
    palette: PaletteName;
    payload: string;
    verifyUrl: string;
};

const ACTIONS: { action: CrystalAction; label: string }[] = [
    { action: "jump", label: "Jump" },
    { action: "spin", label: "Spin" },
    { action: "shine", label: "Shine" },
    { action: "dance", label: "Dance" },
];

type VerifyState =
    | { kind: "idle" }
    | { kind: "checking" }
    | { kind: "ok" }
    | { kind: "denied" }
    | { kind: "error"; message: string };

export function DashboardIsland(props: DashboardIslandProps) {
    return (
        <IslandRoot id={DashboardIslandId} props={props}>
            <DashboardIslandBody {...props} />
        </IslandRoot>
    );
}

function DashboardIslandBody({ palette, payload, verifyUrl }: DashboardIslandProps) {
    const apiRef = useRef<CrystalApi | null>(null);
    const trigger = (action: CrystalAction) => () => apiRef.current?.[action]();

    const [passcode, setPasscode] = useState("");
    const [state, setState] = useState<VerifyState>({ kind: "idle" });

    const handleSubmit = async (event: Event) => {
        event.preventDefault();
        const trimmed = passcode.trim();
        if (!trimmed) return;
        setState({ kind: "checking" });
        try {
            const fd = new FormData();
            fd.set("payload", payload);
            fd.set("passcode", trimmed);
            const res = await fetch(verifyUrl, { method: "POST", body: fd });
            if (!res.ok) {
                throw new Error((await res.text()) || `Request failed (${res.status})`);
            }
            const data = (await res.json()) as { match: boolean };
            if (data.match) {
                setState({ kind: "ok" });
                apiRef.current?.shine();
            } else {
                setState({ kind: "denied" });
            }
        } catch (err) {
            setState({ kind: "error", message: err instanceof Error ? err.message : "Verification failed." });
        }
    };


    useEffect(() => {
        const channel = createChannel({
            transport: createWindowTransport(),
        });
        channel.notify('ready', undefined);
        // channel.notify('notifyHeight', { height: 100 });
    }, []);
    return (
        <section class="flex flex-1 flex-col items-center justify-center gap-10">
            <div class="flex items-center gap-8">
                <div class="shrink-0">
                    <CrystalCharacter size={160} apiRef={apiRef} palette={palette} />
                </div>
                <nav class="flex flex-col items-stretch gap-2">
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

            <form onSubmit={handleSubmit} class="flex w-full max-w-sm flex-col items-stretch gap-2">
                <label class="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
                    Passcode
                </label>
                <div class="flex gap-2">
                    <input
                        type="password"
                        value={passcode}
                        onInput={(event) => {
                            setPasscode((event.currentTarget as HTMLInputElement).value);
                            if (state.kind !== "idle" && state.kind !== "checking") {
                                setState({ kind: "idle" });
                            }
                        }}
                        placeholder="Enter the configured passcode"
                        autocomplete="off"
                        spellcheck={false}
                        class="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground/60 focus:border-foreground/40 focus:ring-2 focus:ring-foreground/10"
                    />
                    <button
                        type="submit"
                        disabled={state.kind === "checking" || passcode.trim().length === 0}
                        class="inline-flex h-10 items-center justify-center rounded-lg bg-foreground px-4 text-[13px] font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40"
                    >
                        {state.kind === "checking" ? "Checking…" : "Check"}
                    </button>
                </div>
                <Feedback state={state} />
            </form>
        </section>
    );
}

function Feedback({ state }: { state: VerifyState }) {
    if (state.kind === "idle" || state.kind === "checking") {
        return <span class="min-h-4 text-[11px] text-muted-foreground/70" />;
    }
    if (state.kind === "ok") {
        return <span class="min-h-4 text-[12px] font-medium text-emerald-700">Hey hello — passcode accepted.</span>;
    }
    if (state.kind === "denied") {
        return <span class="min-h-4 text-[12px] text-destructive">That doesn't match. Try again.</span>;
    }
    return <span class="min-h-4 text-[12px] text-destructive">{state.message}</span>;
}
