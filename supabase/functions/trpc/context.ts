import { createClient } from "@supabase/supabase-js";
import type { Database } from "@ridi-router/lib/supabase.ts";
import { servicesGet } from "@ridi-router/lib/queries_sql.ts";
import type { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import postgres from "postgres";
import { Messaging } from "@ridi-router/messaging/main.ts";
import { parse, string } from "valibot";

type ContextCreatorParams = Parameters<
  NonNullable<Parameters<typeof fetchRequestHandler>[0]["createContext"]>
>[0];

const supabaseUrl = parse(string("supabase url"), Deno.env.get("SUPABASE_URL"));
const supabaseServiceRoleKey = parse(
  string("supabase service role key"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
);
const supabaseDbUrl = parse(
  string("supabase db url"),
  Deno.env.get("SUPABASE_DB_URL"),
);

export const createContext = async (
  { req }: ContextCreatorParams,
  info: Deno.ServeHandlerInfo<Deno.NetAddr>,
) => {
  const supabaseClient = createClient<Database, "public", Database["public"]>(
    supabaseUrl,
    supabaseServiceRoleKey,
  );

  const db = postgres(supabaseDbUrl);
  console.log({ db });
  const manualRec = await db.unsafe("select * from ridi_services.services");
  console.log({ manualRec });
  const routerRec = await servicesGet(db, { name: "router" });
  console.log({ routerRec });

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "") || "";
  const { data } = await supabaseClient.auth.getUser(token);
  const user = data.user;
  console.log({ user });
  const messaging = new Messaging(db, {
    info: (...args: unknown[]) => console.log(...args),
    error: (...args: unknown[]) => console.error(...args),
  });

  return {
    user,
    db,
    messaging,
    info,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
