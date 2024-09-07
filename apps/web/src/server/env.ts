import * as v from "valibot";

const nodeEnvSchema = v.object({
	DATABASE_URL: v.pipe(v.string(), v.url()),
	AUTH_SECRET: v.pipe(v.string(), v.minLength(5)),
	AUTH_TRUST_HOST: v.pipe(v.unknown(), v.transform(Number)),
	GITHUB_CLIENT_ID: v.pipe(v.string(), v.minLength(5)),
	GITHUB_SECRET: v.pipe(v.string(), v.minLength(5)),
	RIDI_ENV: v.union([v.literal("local"), v.literal("dev"), v.literal("prod")]),
});

type NodeEnvSchema = v.InferInput<typeof nodeEnvSchema>;

export const checkEnvVariables = () => v.parse(nodeEnvSchema, process.env);

declare global {
	namespace NodeJS {
		interface ProcessEnv extends NodeEnvSchema { }
	}
}
