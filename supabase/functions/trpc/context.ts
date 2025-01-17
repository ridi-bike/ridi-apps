import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../apps/ridi-router/lib/supabase.ts";
import type { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import postgres from "postgres";
import { Messaging } from "./messaging.ts";

type ContextCreatorParams = Parameters<
  NonNullable<Parameters<typeof fetchRequestHandler>[0]["createContext"]>
>[0];

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabaseDbUrl = Deno.env.get("SUPABASE_DB_URL") ?? "";

export const createContext = async (
  { req }: ContextCreatorParams,
  info: Deno.ServeHandlerInfo<Deno.NetAddr>,
) => {
  const supabaseClient = createClient<Database, "public", Database["public"]>(
    supabaseUrl,
    supabaseServiceRoleKey,
  );

  const db = postgres(supabaseDbUrl);

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "") || "";
  const { data } = await supabaseClient.auth.getUser(token);
  const user = data.user;
  const messaging = new Messaging(db);

  return {
    user,
    db,
    messaging,
    info,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
