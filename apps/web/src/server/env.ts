import { z } from "zod";

const nodeEnvSchema = z.object({
	DATABASE_URL: z.string().min(5),
	AUTH_SECRET: z.string().min(5),
	AUTH_TRUST_HOST: z.coerce.boolean(),
	GITHUB_CLIENT_ID: z.string().min(5),
	GITHUB_SECRET: z.string().min(5),
});

type NodeEnvSchema = z.infer<typeof nodeEnvSchema>;

export const checkEnvVariables = () => nodeEnvSchema.parse(process.env);

declare global {
	namespace NodeJS {
		interface ProcessEnv extends NodeEnvSchema { }
	}
}
