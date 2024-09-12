import * as v from "valibot";
//
// const envSchema = v.object({
// 	RIDI_ENV: v.union([v.literal("local"), v.literal("dev"), v.literal("prod")]),
// 	RIDI_API_URL: v.pipe(v.string(), v.url()),
// });

const vars = {
	RIDI_ENV: process.env.RIDI_ENV,
	RIDI_API_URL: process.env.RIDI_API_URL,
};

export function getEnvVariables() {
	// const envVariables = v.parse(envSchema, vars);
	// return envVariables;
	return vars;
}
