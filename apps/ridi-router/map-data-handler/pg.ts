import { supabaseDbUrl } from "./env-variables.ts";
import postgres from "postgres";
export const pgClient = postgres(supabaseDbUrl);
