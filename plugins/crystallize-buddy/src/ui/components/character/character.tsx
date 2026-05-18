import { useRef, useEffect, useCallback, type RefObject } from 'hono/jsx';
import { cn } from '@/ui/lib/utils';
import { AmbientSparkles } from './ambient-sparkles';
import './styles/character.css';
import { palettes, type PaletteName } from './palettes';

export type CrystalAction = 'jump' | 'spin' | 'shine' | 'dance';

export type CrystalApi = {
    jump: () => void;
    spin: () => void;
    shine: () => void;
    dance: () => void;
};

export type CrystalApiRef = { current: CrystalApi | null };

const EYE_ORIGINS = { L: { x: 33, y: 60 }, R: { x: 42, y: 60.5 } };
const EYE_MAX_OFFSET = 1.5;
const ASPECT_RATIO = 350 / 240;

const SPARKLE_SVG =
    '<svg viewBox="0 0 14 14" xmlns="http://www.w3.org/2000/svg"><path d="M7 0 L8 6 L14 7 L8 8 L7 14 L6 8 L0 7 L6 6 Z" fill="currentColor"/></svg>';

type CrystalCharacterProps = {
    palette?: PaletteName;
    showFace?: boolean;
    size?: number;
    showGlow?: boolean;
    showGround?: boolean;
    showAmbientSparkles?: boolean;
    trackCursor?: boolean;
    idleBlink?: boolean;
    clickToJump?: boolean;
    className?: string;
    style?: Record<string, string | number>;
    apiRef?: CrystalApiRef;
    onAction?: (action: CrystalAction) => void;
};

export function CrystalCharacter({
    palette = 'orange',
    showFace = true,
    size = 240,
    showGlow = true,
    showGround = true,
    showAmbientSparkles = true,
    trackCursor = true,
    idleBlink = true,
    clickToJump = true,
    className,
    style,
    apiRef,
    onAction,
}: CrystalCharacterProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const characterRef = useRef<HTMLDivElement>(null);
    const bobRef = useRef<HTMLDivElement>(null);
    const bodyRef = useRef<SVGGElement>(null);
    const groundRef = useRef<HTMLDivElement>(null);
    const eyeLPupil = useRef<SVGCircleElement>(null);
    const eyeRPupil = useRef<SVGCircleElement>(null);
    const queueRef = useRef<CrystalAction[]>([]);
    const runningRef = useRef(false);

    const resolved = palettes[palette];
    const paletteVars: Record<string, string> = {
        '--c-1': resolved.c1,
        '--c-2': resolved.c2,
        '--c-3': resolved.c3,
        '--c-4': resolved.c4,
        '--c-eye': resolved.eye,
        '--c-cheek': resolved.cheek,
        '--c-glow': resolved.glow,
    };

    useEffect(() => {
        if (!trackCursor) return;
        const onMove = (e: MouseEvent) => {
            const char = characterRef.current;
            if (!char) return;
            const rect = char.getBoundingClientRect();
            const dx = e.clientX - (rect.left + rect.width / 2);
            const dy = e.clientY - (rect.top + rect.height / 2);
            const norm = Math.min(Math.hypot(dx, dy) / 300, 1);
            const angle = Math.atan2(dy, dx);
            const ox = Math.cos(angle) * EYE_MAX_OFFSET * norm;
            const oy = Math.sin(angle) * EYE_MAX_OFFSET * norm;
            eyeLPupil.current?.setAttribute('cx', String(EYE_ORIGINS.L.x + ox));
            eyeLPupil.current?.setAttribute('cy', String(EYE_ORIGINS.L.y + oy));
            eyeRPupil.current?.setAttribute('cx', String(EYE_ORIGINS.R.x + ox));
            eyeRPupil.current?.setAttribute('cy', String(EYE_ORIGINS.R.y + oy));
        };
        document.addEventListener('mousemove', onMove);
        return () => document.removeEventListener('mousemove', onMove);
    }, [trackCursor]);

    useEffect(() => {
        if (!idleBlink) return;
        let cancelled = false;
        let scheduleId: ReturnType<typeof setTimeout> | undefined;
        const subTimers: Array<ReturnType<typeof setTimeout>> = [];
        const fireBlink = () => {
            const body = bodyRef.current;
            if (!body) return;
            body.classList.add('crystal-blink');
            subTimers.push(setTimeout(() => body.classList.remove('crystal-blink'), 200));
            if (Math.random() < 0.2) {
                subTimers.push(
                    setTimeout(() => {
                        if (cancelled) return;
                        body.classList.add('crystal-blink');
                        subTimers.push(setTimeout(() => body.classList.remove('crystal-blink'), 200));
                    }, 300),
                );
            }
        };
        const schedule = () => {
            const delay = 2000 + Math.random() * 3500;
            scheduleId = setTimeout(() => {
                if (cancelled) return;
                fireBlink();
                schedule();
            }, delay);
        };
        schedule();
        return () => {
            cancelled = true;
            if (scheduleId) clearTimeout(scheduleId);
            subTimers.forEach(clearTimeout);
        };
    }, [idleBlink]);

    const spawnSparkles = useCallback((n: number) => {
        const char = characterRef.current;
        const container = containerRef.current;
        if (!char || !container) return;
        const rect = char.getBoundingClientRect();
        const cRect = container.getBoundingClientRect();
        const cx = rect.left - cRect.left + rect.width / 2;
        const cy = rect.top - cRect.top + rect.height / 2;
        for (let i = 0; i < n; i++) {
            const s = document.createElement('div');
            s.className = 'crystal-sparkle';
            s.innerHTML = SPARKLE_SVG;
            const angle = (i / n) * Math.PI * 2 + Math.random() * 0.5;
            const dist = 80 + Math.random() * 100;
            s.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
            s.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
            s.style.left = `${cx - 7}px`;
            s.style.top = `${cy - 7}px`;
            container.appendChild(s);
            requestAnimationFrame(() => s.classList.add('crystal-go'));
            setTimeout(() => s.remove(), 1100);
        }
    }, []);

    const playOneShot = useCallback(
        (cls: string, durationMs: number) =>
            new Promise<void>((resolve) => {
                const bob = bobRef.current;
                if (!bob) {
                    resolve();
                    return;
                }
                bob.classList.add(cls);
                setTimeout(() => {
                    bob.classList.remove(cls);
                    resolve();
                }, durationMs);
            }),
        [],
    );

    const executeJump = useCallback(async () => {
        const ground = groundRef.current;
        const body = bodyRef.current;
        if (ground) {
            setTimeout(() => {
                ground.style.transform = 'translateX(-50%) scale(0.5)';
                ground.style.opacity = '0.5';
            }, 100);
            setTimeout(() => {
                ground.style.transform = 'translateX(-50%) scale(1)';
                ground.style.opacity = '1';
            }, 700);
        }
        await playOneShot('crystal-jumping', 950);
        if (body) {
            body.classList.add('crystal-squish');
            setTimeout(() => body.classList.remove('crystal-squish'), 400);
        }
    }, [playOneShot]);

    const executeSpin = useCallback(async () => {
        spawnSparkles(14);
        await playOneShot('crystal-spinning', 1000);
    }, [playOneShot, spawnSparkles]);

    const executeShine = useCallback(async () => {
        spawnSparkles(20);
        await playOneShot('crystal-shining', 950);
    }, [playOneShot, spawnSparkles]);

    const executeDance = useCallback(async () => {
        await playOneShot('crystal-dancing', 2100);
    }, [playOneShot]);

    const drainQueue = useCallback(async () => {
        if (runningRef.current) return;
        runningRef.current = true;
        const queue = queueRef.current ?? [];
        while (queue.length > 0) {
            const action = queue.shift() as CrystalAction;
            onAction?.(action);
            if (action === 'jump') await executeJump();
            else if (action === 'spin') await executeSpin();
            else if (action === 'shine') await executeShine();
            else await executeDance();
        }
        runningRef.current = false;
    }, [executeJump, executeSpin, executeShine, executeDance, onAction]);

    const enqueue = useCallback(
        (action: CrystalAction) => {
            const queue = queueRef.current ?? (queueRef.current = []);
            queue.push(action);
            void drainQueue();
        },
        [drainQueue],
    );

    const jump = useCallback(() => enqueue('jump'), [enqueue]);
    const spin = useCallback(() => enqueue('spin'), [enqueue]);
    const shine = useCallback(() => enqueue('shine'), [enqueue]);
    const dance = useCallback(() => enqueue('dance'), [enqueue]);

    useEffect(() => {
        if (!apiRef) return;
        apiRef.current = { jump, spin, shine, dance };
        return () => {
            apiRef.current = null;
        };
    }, [apiRef, jump, spin, shine, dance]);

    const containerStyle: Record<string, string | number> = {
        width: size * 1.5,
        height: size * 1.7,
        ...paletteVars,
        ...style,
    };

    return (
        <div
            ref={containerRef as RefObject<HTMLDivElement>}
            class={cn('relative inline-block', className)}
            style={containerStyle}
        >
            {showGlow && <div class="crystal-glow" />}
            {showGround && <div class="crystal-ground" ref={groundRef as RefObject<HTMLDivElement>} />}
            {showAmbientSparkles && <AmbientSparkles />}

            <div
                ref={characterRef as RefObject<HTMLDivElement>}
                class="crystal-character absolute left-1/2 top-1/2 z-2 -translate-x-1/2 -translate-y-1/2"
                onClick={clickToJump ? jump : undefined}
                style={{ width: size, height: size * ASPECT_RATIO }}
            >
                <div ref={bobRef as RefObject<HTMLDivElement>} class="crystal-bob">
                    <svg viewBox="-3 -3 76 110" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <radialGradient id="crystalCheekGrad" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stop-color="var(--c-cheek)" stop-opacity="0.85" />
                                <stop offset="55%" stop-color="var(--c-cheek)" stop-opacity="0.40" />
                                <stop offset="100%" stop-color="var(--c-cheek)" stop-opacity="0" />
                            </radialGradient>
                        </defs>

                        <g ref={bodyRef as RefObject<SVGGElement>} class="crystal-breathe">
                            <path
                                d="M55.3669 45.4332L40.3462 103.691L20.9543 91.2957L35.9764 0L57.8921 35.6656L55.3669 45.4332Z"
                                fill="var(--c-3)"
                            />
                            <path
                                d="M13.8175 47.1943L8.64261 83.4155L5.72941 81.5571L0 39.4316L13.8175 47.1943Z"
                                fill="var(--c-1)"
                            />
                            <path
                                d="M30.2282 23.1053L19.1965 90.167L10.4192 84.5543L21.1874 9.18439L30.2282 23.1053Z"
                                fill="var(--c-2)"
                            />
                            <path
                                d="M69.7476 42.8161L57.3187 90.8097L49.0844 97.6397L42.521 102.951L56.5527 48.5275L69.7476 42.8161Z"
                                fill="var(--c-4)"
                            />

                            {showFace && (
                                <g>
                                    <ellipse cx="28" cy="69" rx="3.4" ry="2.2" fill="url(#crystalCheekGrad)" />
                                    <ellipse cx="46" cy="70" rx="3.4" ry="2.2" fill="url(#crystalCheekGrad)" />

                                    <g>
                                        <ellipse cx="33" cy="60" rx="2.7" ry="3" fill="#FFF8EE" />
                                        <circle
                                            ref={eyeLPupil as RefObject<SVGCircleElement>}
                                            cx="33"
                                            cy="60"
                                            r="1.85"
                                            fill="var(--c-eye)"
                                        />
                                        <circle cx="33.85" cy="59.15" r="0.8" fill="#FFFFFF" />
                                        <circle cx="32.3" cy="60.9" r="0.4" fill="#FFFFFF" opacity="0.85" />
                                        <ellipse
                                            class="crystal-eyelid"
                                            cx="33"
                                            cy="60"
                                            rx="2.7"
                                            ry="3"
                                            fill="var(--c-3)"
                                        />
                                    </g>
                                    <g>
                                        <ellipse cx="42" cy="60.5" rx="2.7" ry="3" fill="#FFF8EE" />
                                        <circle
                                            ref={eyeRPupil as RefObject<SVGCircleElement>}
                                            cx="42"
                                            cy="60.5"
                                            r="1.85"
                                            fill="var(--c-eye)"
                                        />
                                        <circle cx="42.85" cy="59.65" r="0.8" fill="#FFFFFF" />
                                        <circle cx="41.3" cy="61.4" r="0.4" fill="#FFFFFF" opacity="0.85" />
                                        <ellipse
                                            class="crystal-eyelid"
                                            cx="42"
                                            cy="60.5"
                                            rx="2.7"
                                            ry="3"
                                            fill="var(--c-3)"
                                        />
                                    </g>

                                    <g>
                                        <path
                                            d="M 34 71.5 Q 37.8 76.2 41.6 71.8 Q 37.8 73.2 34 71.5 Z"
                                            fill="#A0432A"
                                            opacity="0.5"
                                        />
                                        <path
                                            d="M 34 71.5 Q 37.8 76.2 41.6 71.8"
                                            stroke="var(--c-eye)"
                                            stroke-width="0.9"
                                            fill="none"
                                            stroke-linecap="round"
                                        />
                                    </g>
                                </g>
                            )}
                        </g>
                    </svg>
                </div>
            </div>
        </div>
    );
}
