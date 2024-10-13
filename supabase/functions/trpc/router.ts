import { initTRPC } from "@trpc/server";
import { nullish, object, parser, string } from "valibot";

let id = 0;

const db = {
	posts: [
		{
			id: ++id,
			title: "hello",
		},
	],
};

const t = initTRPC.create();

const publicProcedure = t.procedure;
const router = t.router;

const postRouter = router({
	createPost: publicProcedure
		.input(parser(object({ title: string() })))
		.mutation(({ input }) => {
			const post = {
				id: ++id,
				...input,
			};
			db.posts.push(post);
			return post;
		}),
	listPosts: publicProcedure.query(() => db.posts),
});

export const appRouter = router({
	post: postRouter,
	hello: publicProcedure.input(parser(nullish(string()))).query(({ input }) => {
		return `hello ${input ?? "world"}`;
	}),
});

export type AppRouter = typeof appRouter;
