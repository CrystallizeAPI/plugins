import { useEffect, useRef, type RefObject } from "hono/jsx";
import { cn } from "@/ui/lib/utils";

const AMBIENT_SVG =
    '<svg viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg"><path d="M4 0 L5 3 L8 4 L5 5 L4 8 L3 5 L0 4 L3 3 Z" fill="currentColor"/></svg>';

type AmbientSparklesProps = {
    enabled?: boolean;
    intervalMs?: number;
    spreadX?: number;
    spreadY?: number;
    lifetimeMs?: number;
    className?: string;
};

export function AmbientSparkles({
    enabled = true,
    intervalMs = 700,
    spreadX = 180,
    spreadY = 120,
    lifetimeMs = 2700,
    className,
}: AmbientSparklesProps) {
    const layerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!enabled) return;
        const layer = layerRef.current;
        if (!layer) return;
        const interval = setInterval(() => {
            const rect = layer.getBoundingClientRect();
            const cx = rect.width / 2 + (Math.random() - 0.5) * spreadX;
            const cy = rect.height / 2 + (Math.random() - 0.5) * spreadY;
            const s = document.createElement("div");
            s.className = "crystal-ambient-sparkle";
            s.innerHTML = AMBIENT_SVG;
            s.style.left = `${cx - 4}px`;
            s.style.top = `${cy - 4}px`;
            layer.appendChild(s);
            setTimeout(() => s.remove(), lifetimeMs);
        }, intervalMs);
        return () => clearInterval(interval);
    }, [enabled, intervalMs, spreadX, spreadY, lifetimeMs]);

    return (
        <div
            ref={layerRef as RefObject<HTMLDivElement>}
            class={cn("pointer-events-none absolute inset-0 z-1", className)}
            aria-hidden="true"
        />
    );
}
