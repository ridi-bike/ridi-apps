import { EnvVariables } from "./env-variables.ts";
import postgres from "postgres";
export const pgClient = postgres(EnvVariables.get().supabaseDbUrl);
