import { wrap } from "@typeschema/valibot";
import { string } from "valibot";
import { createTRPCRouter, baseProcedure } from "../trpc";

export const exampleRouter = createTRPCRouter({
	hello: baseProcedure.input(wrap(string())).query(({ input }) => {
		return `Hello ${input}!`;
	}),
	sendMsg: baseProcedure.input(wrap(string())).mutation(async ({ input, ctx }) => {
		await ctx.db.testing.create({
			data: {
				msg: input
			}
		})

		return "ok"
	})
});
