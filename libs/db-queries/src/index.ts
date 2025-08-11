import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

// eslint-disable-next-line import/consistent-type-specifier-style
import type { DB } from "./kysely-db.d.ts"; // this is the Database interface we defined earlier

export * from "./queries_sql.ts";

export function getDb(connectionString: string) {
  const dialect = new PostgresDialect({
    pool: new Pool({
      connectionString,
    }),
  });

  return new Kysely<DB>({
    log: ["query", "error"],
    dialect,
  });
}
