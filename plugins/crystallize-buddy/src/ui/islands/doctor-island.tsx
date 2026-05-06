import { useState } from "hono/jsx";
import { IslandRoot } from "virtual:islands/runtime";

export type DoctorIslandProps = {
    fixUrl: string;
    payload: string;
    missingCount: number;
};

export const DoctorIslandId = "doctor-island";

export function DoctorIsland(props: DoctorIslandProps) {
    return (
        <IslandRoot id={DoctorIslandId} props={props}>
            <DoctorIslandBody {...props} />
        </IslandRoot>
    );
}

function DoctorIslandBody({ fixUrl, payload, missingCount }: DoctorIslandProps) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [created, setCreated] = useState<number | null>(null);

    const handleFix = async () => {
        setBusy(true);
        setError(null);
        setCreated(null);
        try {
            const fd = new FormData();
            fd.set("payload", payload);
            const res = await fetch(fixUrl, { method: "POST", body: fd });
            if (!res.ok) {
                throw new Error((await res.text()) || `Request failed (${res.status})`);
            }
            const data = (await res.json()) as { created: number };
            setCreated(data.created);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create webhooks.");
        } finally {
            setBusy(false);
        }
    };

    if (created !== null) {
        return (
            <div class="flex items-start gap-2 rounded-lg border border-emerald-600/60 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-800">
                Created {created} webhook{created === 1 ? "" : "s"}. Reopen the Doctor to verify.
            </div>
        );
    }

    return (
        <div class="flex flex-col gap-2">
            {error && (
                <div class="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {error}
                </div>
            )}
            <div>
                <button
                    type="button"
                    onClick={handleFix}
                    disabled={busy}
                    class="inline-flex items-center gap-2 rounded-lg bg-foreground px-3 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                    {busy ? "Creating…" : `Create ${missingCount} missing webhook${missingCount === 1 ? "" : "s"}`}
                </button>
            </div>
        </div>
    );
}
