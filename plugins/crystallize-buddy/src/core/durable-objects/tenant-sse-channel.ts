import { DurableObject } from "cloudflare:workers";

type SSEMessage = {
    id?: string;
    event?: string;
    data: string;
};

const STATE_KEY = "installation-state";

type StoredInstallationState = {
    configuration: Record<string, unknown>;
    signatureSecret: string | null;
    updatedAt: number;
};

const formatSSEMessage = ({ id, event, data }: SSEMessage): string => {
    let message = "";
    if (id) message += `id: ${id}\n`;
    if (event) message += `event: ${event}\n`;
    for (const line of data.split("\n")) {
        message += `data: ${line}\n`;
    }
    message += "\n";
    return message;
};

export class TenantSSEChannel extends DurableObject<CloudflareBindings> {
    private subscribers = new Set<ReadableStreamDefaultController<Uint8Array>>();

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);
        switch (url.pathname) {
            case "/subscribe":
                return this.handleSubscribe();
            case "/push":
                return this.handlePush(request);
            case "/close":
                return this.handleClose();
            case "/state":
                if (request.method === "GET") return this.handleGetState();
                if (request.method === "POST") return this.handleSetState(request);
                return new Response("method not allowed", { status: 405 });
            case "/health":
                return Response.json({
                    status: "pass",
                    ts: Date.now(),
                    subscribers: this.subscribers.size,
                });
            default:
                return new Response("Not found", { status: 404 });
        }
    }

    private async handleGetState(): Promise<Response> {
        const state = await this.ctx.storage.get<StoredInstallationState>(STATE_KEY);
        if (!state) return new Response("not found", { status: 404 });
        return Response.json(state);
    }

    private async handleSetState(request: Request): Promise<Response> {
        const body = await request.json<Pick<StoredInstallationState, "configuration" | "signatureSecret">>();
        const next: StoredInstallationState = {
            configuration: body.configuration ?? {},
            signatureSecret: body.signatureSecret ?? null,
            updatedAt: Date.now(),
        };
        await this.ctx.storage.put(STATE_KEY, next);
        return Response.json(next);
    }

    private handleSubscribe(): Response {
        const encoder = new TextEncoder();
        let controllerRef: ReadableStreamDefaultController<Uint8Array> | undefined;
        let intervalId: ReturnType<typeof setInterval> | undefined;

        const stream = new ReadableStream<Uint8Array>({
            start: (controller) => {
                controllerRef = controller;
                this.subscribers.add(controller);
                controller.enqueue(
                    encoder.encode(
                        formatSSEMessage({
                            id: new Date().toISOString(),
                            event: "management",
                            data: "connected",
                        }),
                    ),
                );
                intervalId = setInterval(() => {
                    try {
                        controller.enqueue(encoder.encode(formatSSEMessage({ event: "management", data: "ping" })));
                    } catch {
                        this.subscribers.delete(controller);
                        if (intervalId) clearInterval(intervalId);
                    }
                }, 5000);
            },
            cancel: () => {
                if (controllerRef) this.subscribers.delete(controllerRef);
                if (intervalId) clearInterval(intervalId);
            },
        });

        return new Response(stream, {
            headers: {
                "Transfer-Encoding": "chunked",
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });
    }

    private async handlePush(request: Request): Promise<Response> {
        const { event, ...data } = await request.json<{ event: string; [key: string]: unknown }>();
        const encoder = new TextEncoder();
        const payload = encoder.encode(
            formatSSEMessage({
                id: new Date().toISOString(),
                event,
                data: JSON.stringify(data),
            }),
        );
        for (const controller of this.subscribers) {
            try {
                controller.enqueue(payload);
            } catch {
                this.subscribers.delete(controller);
            }
        }
        return Response.json({ success: "ok", subscribers: this.subscribers.size });
    }

    private handleClose(): Response {
        const encoder = new TextEncoder();
        const closePayload = encoder.encode(
            formatSSEMessage({ event: "management", data: "connection closed by server" }),
        );
        for (const controller of this.subscribers) {
            try {
                controller.enqueue(closePayload);
            } catch {
                // already closed
            }
            try {
                controller.close();
            } catch {
                // already closed
            }
            this.subscribers.delete(controller);
        }
        return Response.json({ success: "ok" });
    }
}
