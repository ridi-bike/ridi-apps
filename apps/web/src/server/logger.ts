import "@ridi/server-client-check/server-only";
import pino from "pino";
import { isLocalDev } from "~/lib/env";

export const appLogger = !isLocalDev()
	? pino({
		// transport: {
		// 	target: "@axiomhq/pino",
		// 	options: {
		// 		dataset: process.env.AXIOM_DATASET,
		// 		token: process.env.AXIOM_TOKEN,
		// 	},
		// },
	})
	: pino({
		level: "trace",
		transport: {
			target: "pino-pretty",
			options: {
				colorize: true,
			},
		},
	});
