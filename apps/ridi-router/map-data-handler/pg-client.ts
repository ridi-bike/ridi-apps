import { EnvVariables } from "./env-variables.ts";
import postgres from "postgres";

const pgInstance = {
  pgClient: null,
  closed: true,
} as {
  pgClient: ReturnType<typeof postgres> | null;
  closed: boolean;
};

export type PgClient = ReturnType<typeof postgres>;

export function getPgClient() {
  if (pgInstance.closed || !pgInstance.pgClient) {
    pgInstance.pgClient = postgres(new EnvVariables().supabaseDbUrl);
  }
  return pgInstance.pgClient;
}

export async function closePgClient() {
  await pgInstance.pgClient?.end({ timeout: 1 });
  pgInstance.closed = true;
}
