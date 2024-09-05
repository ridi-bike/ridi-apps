import GithubProvider from "@auth/core/providers/github";
import type { SolidAuthConfig } from "@solid-mediakit/auth/src/index";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { systemDbClient } from "@ridi/database";

export const authOptions: SolidAuthConfig = {
	adapter: PrismaAdapter(systemDbClient),
	providers: [GithubProvider({})],
};
