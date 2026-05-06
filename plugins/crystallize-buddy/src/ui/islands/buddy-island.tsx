import { useEffect, useRef, useState } from "hono/jsx";
import { IslandRoot } from "virtual:islands/runtime";
import { CrystalCharacter, type CrystalAction, type CrystalApi } from "../components/character/character";

type BulkTaskCounts = {
    complete: number;
    error: number;
    pending: number;
    started: number;
};

type BuddyIslandProps = {
    subscribeUrl?: string;
    bulkTaskCounts: BulkTaskCounts;
};

export const BuddyIslandId = "buddy-island";

const MAX_MESSAGES = 30;
const ACTION_POOL: CrystalAction[] = ["jump", "spin", "dance"];

type BuddyMessage = {
    id: number;
    at: number;
    kind: "action";
    label: string;
    detail?: string;
};

type SSEActionEnvelope = {
    concern: string | null;
    action: string | null;
    payload: unknown;
};

function formatActionEnvelope(envelope: SSEActionEnvelope): { label: string; detail?: string } {
    const concern = envelope.concern ?? "event";
    const action = envelope.action ?? "?";
    const label = `${concern}/${action}`;
    const payload = envelope.payload;
    let detail: string | undefined;
    if (payload && typeof payload === "object") {
        const p = payload as Record<string, unknown>;
        const candidate =
            (typeof p.id === "string" && p.id) ||
            (typeof p.path === "string" && p.path) ||
            (typeof p.itemPath === "string" && p.itemPath);
        if (candidate) detail = String(candidate);
        if (!detail && typeof p.type === "string") detail = p.type;
    } else if (typeof payload === "string") {
        detail = payload;
    }
    return { label, detail };
}

export function BuddyIsland(props: BuddyIslandProps) {
    const { subscribeUrl, bulkTaskCounts } = props;
    const apiRef = useRef<CrystalApi | null>(null);
    const [messages, setMessages] = useState<BuddyMessage[]>([]);
    const idRef = useRef(0);

    useEffect(() => {
        if (!subscribeUrl) return;

        const pushMessage = (entry: Omit<BuddyMessage, "id" | "at">) => {
            const id = (idRef.current ?? 0) + 1;
            idRef.current = id;
            setMessages((prev) => [{ id, at: Date.now(), ...entry }, ...prev].slice(0, MAX_MESSAGES));
        };

        const source = new EventSource(subscribeUrl);
        const onAction = (event: MessageEvent) => {
            try {
                const envelope = JSON.parse(event.data) as SSEActionEnvelope;
                const { label, detail } = formatActionEnvelope(envelope);
                pushMessage({ kind: "action", label, detail });
                const action = ACTION_POOL[Math.floor(Math.random() * ACTION_POOL.length)];
                apiRef.current?.[action]();
            } catch (err) {
                console.error("[buddy] failed to parse action event", err);
            }
        };
        const onManagement = (event: MessageEvent) => {
            const what = String(event.data);
            if (what === "connected") {
                apiRef.current?.shine();
            }
        };
        source.addEventListener("action", onAction);
        source.addEventListener("management", onManagement);
        source.onerror = (err) => console.warn("[buddy] sse error", err);
        return () => {
            source.removeEventListener("action", onAction);
            source.removeEventListener("management", onManagement);
            source.close();
        };
    }, [subscribeUrl]);

    const palette = "orange";

    return (
        <IslandRoot id={BuddyIslandId} props={props} className="flex min-h-0 flex-1 flex-col">
            <div class="flex min-h-0 w-full flex-1 flex-col gap-5">
                <div class="flex justify-center pt-1">
                    <CrystalCharacter size={110} apiRef={apiRef} palette={palette} />
                </div>
                <section class="flex flex-col gap-1.5">
                    <SectionLabel>Bulk tasks</SectionLabel>
                    <BulkTaskStrip counts={bulkTaskCounts} />
                </section>
                <section class="flex min-h-0 flex-1 flex-col gap-1.5">
                    <SectionLabel>Recent events</SectionLabel>
                    <EventFeed messages={messages} />
                </section>
            </div>
        </IslandRoot>
    );
}

function SectionLabel({ children }: { children: string }) {
    return (
        <h3 class="px-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">{children}</h3>
    );
}

function BulkTaskStrip({ counts }: { counts: BulkTaskCounts }) {
    return (
        <div class="flex flex-wrap items-center gap-1.5">
            <Chip tone="success" symbol="✓" label="complete" value={counts.complete} />
            <Chip tone="info" symbol="▶" label="started" value={counts.started} />
            <Chip tone="warn" symbol="⏳" label="pending" value={counts.pending} />
            <Chip tone="error" symbol="⚠" label="errors" value={counts.error} />
        </div>
    );
}

type ChipTone = "success" | "info" | "warn" | "error";

const TONE_CLASSES: Record<ChipTone, { active: string; muted: string }> = {
    success: {
        active: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700",
        muted: "border-border/60 bg-muted/40 text-muted-foreground",
    },
    info: {
        active: "border-sky-500/40 bg-sky-500/10 text-sky-700",
        muted: "border-border/60 bg-muted/40 text-muted-foreground",
    },
    warn: {
        active: "border-amber-500/50 bg-amber-500/10 text-amber-700",
        muted: "border-border/60 bg-muted/40 text-muted-foreground",
    },
    error: {
        active: "border-destructive/50 bg-destructive/10 text-destructive",
        muted: "border-border/60 bg-muted/40 text-muted-foreground",
    },
};

function Chip({ tone, symbol, label, value }: { tone: ChipTone; symbol: string; label: string; value: number }) {
    const classes = TONE_CLASSES[tone][value === 0 ? "muted" : "active"];
    return (
        <span
            class={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none tabular-nums ${classes}`}
            title={label}
        >
            <span aria-hidden="true">{symbol}</span>
            <span class="font-semibold">{value}</span>
            <span class="opacity-70">{label}</span>
        </span>
    );
}

function EventFeed({ messages }: { messages: BuddyMessage[] }) {
    if (messages.length === 0) {
        return (
            <div class="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl bg-white px-3 py-6 text-center shadow-sm">
                <span class="text-[11px] font-medium text-muted-foreground">Waiting for events…</span>
                <span class="text-[10px] text-muted-foreground/60">Activity from your tenant will appear here.</span>
            </div>
        );
    }
    return (
        <ul class="flex min-h-0 flex-1 flex-col divide-y divide-border/40 overflow-y-auto rounded-2xl bg-white text-[11px] shadow-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {messages.map((m) => (
                <li key={m.id} class="flex items-baseline gap-2 px-3 py-1.5 leading-snug">
                    <time class="shrink-0 tabular-nums text-muted-foreground/80">{formatTime(m.at)}</time>
                    <span class="shrink-0 rounded px-1 text-[9px] uppercase tracking-wide bg-primary/10 text-primary">
                        evt
                    </span>
                    <span class="min-w-0 flex-1 truncate">
                        <span class="font-medium text-foreground">{m.label}</span>
                        {m.detail && <span class="ml-1 text-muted-foreground">{m.detail}</span>}
                    </span>
                </li>
            ))}
        </ul>
    );
}

function formatTime(ts: number): string {
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
}
