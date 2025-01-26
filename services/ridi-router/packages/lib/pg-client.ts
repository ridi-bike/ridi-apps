import { BaseEnvVariables } from "@ridi-router/env/main.ts";
import postgres from "postgres/mod.js";

const pgInstance = {
  pgClient: null,
} as {
  pgClient: ReturnType<typeof postgres> | null;
};

export type PgClient = ReturnType<typeof postgres>;

export function getPgClient() {
  if (!pgInstance.pgClient) {
    pgInstance.pgClient = postgres(new BaseEnvVariables().supabaseDbUrl);
  }
  return pgInstance.pgClient;
}

export async function closePgClient() {
  await pgInstance.pgClient?.end();
  pgInstance.pgClient = null;
}
