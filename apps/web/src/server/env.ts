/* eslint-disable @typescript-eslint/no-empty-interface */
import { z } from "zod";

const nodeEnvSchema = z.object({
	TURSO_DATABASE_URL_SYSTEM: z.string().min(5),
	TURSO_AUTH_TOKEN_SYSTEM: z.string().min(5),
	AUTH_SECRET: z.string().min(5),
	AUTH_TRUST_HOST: z.coerce.boolean(),
	GITHUB_CLIENT_ID: z.string().min(5),
	GITHUB_SECRET: z.string().min(5),
});

type NodeEnvSchema = z.infer<typeof nodeEnvSchema>;

export const checkEnvVariables = () => nodeEnvSchema.parse(process.env);

declare global {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace NodeJS {
		// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
		interface ProcessEnv extends NodeEnvSchema {}
	}
}
