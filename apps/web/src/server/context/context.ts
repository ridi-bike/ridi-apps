import "@ridi/server-client-check/server-only";
import { type Prisma, prismaClient } from "@ridi/database";
import { getSession } from "@solid-mediakit/auth";
import { getWebRequest } from "vinxi/server";
import { appLogger } from "../logger";
import { authOptions } from "../auth";
import { getLogContextRequest } from "./log";
import { AppError } from "~/lib/error";
import type { Db } from "./types";

type ContextLogger = {
	info: (event: string, args: Record<string, unknown>) => void;
	error: (error: AppError) => void;
	debug: (event: string, args: Record<string, unknown>) => void;
};

type AppBaseContext = {
	db: Db;
	logger: ContextLogger;
};

export type AppRequestBaseContext = {
	requestId: string;
} & AppBaseContext;

export type AppRequestAnonContext = {
	type: "request-anon";
} & AppRequestBaseContext;

export type AppRequestUserContext = {
	type: "request-user";
	user: Prisma.PromiseReturnType<typeof prismaClient.user.findFirstOrThrow>;
} & AppRequestBaseContext;

export type AppRequestContext = AppRequestUserContext | AppRequestAnonContext;

export async function createRequestContext(
	db: Db,
	requestId: string,
): Promise<AppRequestContext> {
	const request = getWebRequest();
	const session = await getSession(request, authOptions);

	if (!session) {
		const anonContext: AppRequestAnonContext = {
			type: "request-anon",
			db,
			requestId,
			logger: {
				info: (event: string, args: Record<string, unknown>) => {
					appLogger.info(
						{
							...args,
							context: getLogContextRequest(requestId, null),
						},
						event,
					);
				},
				error: (err: AppError) => {
					const context = getLogContextRequest(requestId, null);
					appLogger.error({ err, context }, "App error logged");
				},
				debug: (event: string, args: Record<string, unknown>) => {
					appLogger.debug(
						{
							...args,
							context: getLogContextRequest(requestId, null),
						},
						event,
					);
				},
			},
		};

		return anonContext;
	}

	if (!session.user) {
		throw new AppError(
			"missing-user-on-session",
			"Expected user to exist on session",
			requestId,
		);
	}

	const user = await prismaClient.user.findFirstOrThrow({
		where: {
			id: {
				equals: session.user.id,
			},
		},
	});

	const logContext = getLogContextRequest(requestId, user.id);

	const userContext: AppRequestUserContext = {
		type: "request-user",
		db,
		requestId,
		user,
		logger: {
			info: (event: string, args: Record<string, unknown>) => {
				appLogger.info({ ...args, context: logContext }, event);
			},

			error: (err: AppError) => {
				appLogger.error({ err, context: logContext }, "App error logged");
			},

			debug: (event: string, args: Record<string, unknown>) => {
				appLogger.debug({ ...args, context: logContext }, event);
			},
		},
	};

	return userContext;
}
