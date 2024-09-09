import { initTRPC, TRPCError } from "@trpc/server";
import { AppError } from "~/lib/error";
import type { createRequestContext } from "../context/context";

export const t = initTRPC.context<typeof createRequestContext>().create();

export const createTRPCRouter = t.router;
export const baseProcedure = t.procedure;

export const anonProcedure = baseProcedure.use((opts) => {
	if (opts.ctx.type !== "request-anon") {
		throw new TRPCError({
			code: "FORBIDDEN",
			cause: new AppError(
				"api-forbidden-context-type",
				"Forbidden context type when calling api",
				opts.ctx.requestId,
				{
					type: opts.ctx.type,
					api: "anon",
				},
			),
		});
	}
	return opts.next(opts);
});

export const userProcedure = baseProcedure.use((opts) => {
	if (opts.ctx.type !== "request-user") {
		throw new TRPCError({
			code: "FORBIDDEN",
			cause: new AppError(
				"api-forbidden-context-type",
				"Forbidden context type when calling api",
				opts.ctx.requestId,
				{
					type: opts.ctx.type,
					api: "user",
				},
			),
		});
	}
	return opts.next(opts);
});

export const createCallerFactory = t.createCallerFactory;
