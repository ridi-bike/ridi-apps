import { EnvVariables } from "./env-variables.ts";
import postgres from "postgres";

let pgClient: ReturnType<typeof postgres> | null = null;

export type PgClient = ReturnType<typeof postgres>;

export const getPgClient = () => {
  if (!pgClient) {
    pgClient = postgres(EnvVariables.get().supabaseDbUrl);
  }
  return pgClient;
};
