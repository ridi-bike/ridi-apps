import { PrismaClient as PrismaUserClient } from "@ridi/generated-user";
import { PrismaClient as PrismaSystemClient } from "@ridi/generated-system";

import { createClient } from "@libsql/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

console.log(import.meta.env);
console.log(process.env);

const libsql = createClient({
	url: `${process.env.TURSO_DATABASE_URL_SYSTEM}`,
	authToken: `${process.env.TURSO_AUTH_TOKEN_SYSTEM}`,
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
