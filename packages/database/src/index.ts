import { PrismaClient as PrismaUserClient } from "../generated/user";
import { PrismaClient as PrismaSystemClient } from "../generated/system";

import { createClient } from "@libsql/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

const libsql = createClient({
	url: `${process.env.TURSO_DATABASE_URL}`,
	authToken: `${process.env.TURSO_AUTH_TOKEN}`,
});

const adapter = new PrismaLibSQL(libsql);
export const systemDbClient = new PrismaSystemClient({ adapter });

export function constructUserDbClient(
	url: string,
	authToken: string,
): PrismaUserClient {
	const libsql = createClient({
		url,
		authToken,
	});

	const adapter = new PrismaLibSQL(libsql);
	return new PrismaUserClient({ adapter });
}
