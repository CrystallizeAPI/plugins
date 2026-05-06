import type { ClientInterface } from "@crystallize/js-api-client";
import type { ManagedConcern, ManagedEvent, WebhookCheck, WebhookManager } from "@/contracts/services/webhook-manager";

const MANAGED_WEBHOOK_CONCERNS = ["orders", "items", "customers"] as const satisfies readonly ManagedConcern[];
const MANAGED_WEBHOOK_EVENTS = ["create", "update", "delete"] as const satisfies readonly ManagedEvent[];

type ExistingWebhook = {
    id: string;
    concern: string;
    event: string;
    headers: { name: string; value: string }[] | null;
};

const buildWebhookBaseUrl = (pluginUrl: string, tenantIdentifier: string): string => {
    const base = pluginUrl.replace(/\/+$/, "");
    return `${base}/${tenantIdentifier}/api/webhook/receive`;
};

const buildWebhookUrl = (
    pluginUrl: string,
    tenantIdentifier: string,
    concern: ManagedConcern,
    event: ManagedEvent,
): string => {
    const params = new URLSearchParams({ concern, event });
    return `${buildWebhookBaseUrl(pluginUrl, tenantIdentifier)}?${params.toString()}`;
};

const fetchManagedWebhooks = async (client: ClientInterface, pluginIdentifier: string) => {
    const { webhooks } = await client.nextPimApi<{
        webhooks: { edges: { node: ExistingWebhook }[] };
    }>(QUERY_GET_EXISTING_WEBHOOKS);
    return webhooks.edges
        .map((edge) => edge.node)
        .filter((node) =>
            node.headers?.some((header) => header.name === "x-plugin-identifier" && header.value === pluginIdentifier),
        );
};

const buildChecks = (managed: ExistingWebhook[]): WebhookCheck[] => {
    const byKey = new Map<string, ExistingWebhook>();
    for (const w of managed) byKey.set(`${w.concern}/${w.event}`, w);
    const checks: WebhookCheck[] = [];
    for (const concern of MANAGED_WEBHOOK_CONCERNS) {
        for (const event of MANAGED_WEBHOOK_EVENTS) {
            const found = byKey.get(`${concern}/${event}`);
            checks.push({
                concern,
                event,
                present: !!found,
                id: found?.id ?? null,
            });
        }
    }
    return checks;
};

export const createWebhookManager = (): WebhookManager => ({
    async inspect({ crystallizeClient, pluginIdentifier, pluginUrl, tenantIdentifier }) {
        const managed = await fetchManagedWebhooks(crystallizeClient, pluginIdentifier);
        return {
            webhookUrl: buildWebhookBaseUrl(pluginUrl, tenantIdentifier),
            checks: buildChecks(managed),
        };
    },
    async ensureMissing({ crystallizeClient, pluginIdentifier, pluginUrl, tenantIdentifier }) {
        const managed = await fetchManagedWebhooks(crystallizeClient, pluginIdentifier);
        const checks = buildChecks(managed);
        const missing = checks.filter((check) => !check.present);

        await Promise.all(
            missing.map(({ concern, event }) =>
                crystallizeClient.nextPimApi(MUTATION_CREATE_WEBHOOK, {
                    input: {
                        concern,
                        event,
                        graphqlQuery: "",
                        graphqlQueryTarget: "current",
                        headers: [{ name: "x-plugin-identifier", value: pluginIdentifier }],
                        method: "POST",
                        name: `Crystallize Buddy - ${concern}/${event}`,
                        preserveDefaultPayload: true,
                        url: buildWebhookUrl(pluginUrl, tenantIdentifier, concern, event),
                    },
                }),
            ),
        );

        const refreshed = await fetchManagedWebhooks(crystallizeClient, pluginIdentifier);
        return {
            webhookUrl: buildWebhookBaseUrl(pluginUrl, tenantIdentifier),
            checks: buildChecks(refreshed),
            created: missing.length,
        };
    },
    async removeAll({ crystallizeClient, pluginIdentifier }) {
        const managed = await fetchManagedWebhooks(crystallizeClient, pluginIdentifier);
        await Promise.all(
            managed.map((webhook) => crystallizeClient.nextPimApi(MUTATION_DELETE_WEBHOOK, { id: webhook.id })),
        );
        return { removed: managed.length };
    },
});

const MUTATION_CREATE_WEBHOOK = `#graphql
mutation CREATE_WEBHOOK($input: CreateWebhookInput!) {
  createWebhook(input: $input) {
    ... on Webhook {
      id
      name
    }
    ... on BasicError {
      errorName
      message
    }
  }
}`;

const MUTATION_DELETE_WEBHOOK = `#graphql
mutation DELETE_WEBHOOK($id: ID!) {
  deleteWebhook(id: $id) {
    ... on DeleteCount {
      removed
    }
    ... on BasicError {
      errorName
      message
    }
  }
}`;

const QUERY_GET_EXISTING_WEBHOOKS = `#graphql
query GET_EXISTING_WEBHOOKS {
  webhooks {
    ... on WebhookConnection {
      edges {
        node {
          id
          concern
          event
          headers {
            name
            value
          }
        }
      }
    }
  }
}`;
