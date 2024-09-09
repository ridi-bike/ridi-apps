import "@ridi/server-client-check/server-only";
import { createApiClient } from "./root";
import { createRequestContext } from "../context/context";
import { prismaClient } from "@ridi/database";
import { getWebRequest } from "vinxi/http";
import cuid from "@bugsnag/cuid";
import { AppError } from "~/lib/error";
import { appLogger } from "../logger";
import type { Db } from "../context/types";

type CallbackInput = {
	apiClient: ReturnType<typeof createApiClient>;
};

type BackendCallResult<T> =
	| {
		result: "ok";
		data: T;
	}
	| {
		result: "error";
		error: AppError;
	};

export async function tryBackendAction<TOutput>(
	fn: (input: CallbackInput) => Promise<TOutput>,
): Promise<BackendCallResult<TOutput>> {
	return tryBackendCall("action", fn);
}

export async function tryBackendQuery<TOutput>(
	fn: (input: CallbackInput) => Promise<TOutput>,
): Promise<BackendCallResult<TOutput>> {
	return tryBackendCall("query", fn);
}

async function tryBackendCall<TOutput>(
	type: "action" | "query",
	fn: (input: CallbackInput) => Promise<TOutput>,
): Promise<BackendCallResult<TOutput>> {
	const request = getWebRequest();
	const requestId = request.headers.get("x-request-id") || cuid();
	const callContext = {
		requestId,
		url: request.url,
		headers: Array.from(request.headers).reduce(
			(all, curr) => {
				if (curr[0].toLowerCase() === "authorization") {
					all[curr[0]] = `${curr[1].split(" ")[0]} *** removed ***`;
				} else {
					all[curr[0]] = curr[1];
				}
				return all;
			},
			{} as Record<string, string>,
		),
		method: request.method,
		redirect: request.redirect,
	};
	try {
		let dbTransResolve: () => void = () => undefined;
		let dbTransReject: () => void = () => undefined;
		let dbTransStarted = false;

		let db: Db = prismaClient;

		if (type === "action") {
			dbTransStarted = true;
			await new Promise<void>((dbTransSetupResolve) => {
				prismaClient.$transaction(async (dbTrans) => {
					appLogger.debug({ requestId }, "db-trans-started");
					db = dbTrans;
					return new Promise<void>((resolve, reject) => {
						dbTransResolve = resolve;
						dbTransReject = reject;
						dbTransSetupResolve();
					});
				})
					.catch((error) => appLogger.debug(error, "db-trans-abort-error"));
			})
		}
		const ctx = await createRequestContext(db, requestId);
		const apiClient = createApiClient(ctx);

		try {
			const data = await fn({ apiClient });

			if (dbTransStarted) {
				appLogger.debug({ requestId }, "db-trans-commit");
				dbTransResolve();
				dbTransStarted = false;
			}

			return {
				result: "ok",
				data,
			};
		} catch (err) {
			if (dbTransStarted) {
				appLogger.debug({ requestId }, "db-trans-rollback");
				dbTransReject();
				dbTransStarted = false;
			}

			const error = new AppError(
				"backend-call-error",
				"Error encounter while processing backend call",
				callContext,
				err,
			);

			ctx.logger.error(error);
			return {
				result: "error",
				error,
			};
		}
	} catch (err) {
		const error = new AppError(
			"backend-context-error",
			"Error encounter while processing backend call",
			callContext,
			err,
		);
		appLogger.error({ err: error }, "Failed to construct CallContext");
		return {
			result: "error",
			error,
		};
	}
}
