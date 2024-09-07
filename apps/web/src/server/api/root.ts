import { exampleRouter } from "./routers/example";
import { createCallerFactory, createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
	example: exampleRouter,
});

export type AppRouter = typeof appRouter;
export const createApiCaller = createCallerFactory(appRouter);
