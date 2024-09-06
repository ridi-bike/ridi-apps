import GithubProvider from "@auth/core/providers/github";
import type { SolidAuthConfig } from "@solid-mediakit/auth/src/index";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prismaClient } from "@ridi/database";

export const authOptions: SolidAuthConfig = {
	adapter: PrismaAdapter(prismaClient),
	providers: [
		GithubProvider({
			clientId: process.env.GITHUB_CLIENT_ID,
			clientSecret: process.env.GITHUB_SECRET,
		}),
	],
};
