import { z } from 'zod';

const EnvSchema = z.object({
    ENVIRONMENT: z.string().default('development'),
    PLUGIN_IDENTIFIER: z.string().min(1),
    PLUGIN_URL: z.string().min(1),
    PLUGIN_PRIVATE_JWK: z.string().min(1),
    PORT: z.coerce.number().default(5173),
});

export type Config = z.infer<typeof EnvSchema>;

let cached: Config | null = null;

/**
 * Reads and validates process.env exactly once. Throws at first call
 * (process startup) if required vars are missing — never mid-request.
 */
export const getConfig = (): Config => {
    if (cached) return cached;
    const parsed = EnvSchema.safeParse(process.env);
    if (!parsed.success) {
        throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
    }
    cached = parsed.data;
    return cached;
};
