import { EnvVariables } from "./env-variables.ts";
import postgres from "postgres";

const pgInstance = {
  pgClient: null,
} as {
  pgClient: ReturnType<typeof postgres> | null;
};

export type PgClient = ReturnType<typeof postgres>;

export function getPgClient() {
  if (!pgInstance.pgClient) {
    pgInstance.pgClient = postgres(new EnvVariables().supabaseDbUrl);
  }
  return pgInstance.pgClient;
}

export async function closePgClient() {
  await pgInstance.pgClient?.end({ timeout: 1 });
  pgInstance.pgClient = null;
}
