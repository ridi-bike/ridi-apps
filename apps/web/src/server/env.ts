/* eslint-disable @typescript-eslint/no-empty-interface */
import { z } from "zod";

const nodeEnvSchema = z.object({
	TURSO_DATABASE_URL_SYSTEM: z.string(),
	TURSO_AUTH_TOKEN_SYSTEM: z.string(),
	AUTH_SECRET: z.string(),
	AUTH_TRUST_HOST: z.boolean(),
});

type NodeEnvSchema = z.infer<typeof nodeEnvSchema>;

export const checkEnvVariables = () => nodeEnvSchema.parse(process.env);

declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace NodeJS {
		// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
		interface ProcessEnv extends NodeEnvSchema { }
	}
}
