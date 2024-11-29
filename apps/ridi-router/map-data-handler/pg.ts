import { envVariables } from "./env-variables.ts";
import postgres from "postgres";
export const pgClient = postgres(envVariables.supabaseDbUrl);
