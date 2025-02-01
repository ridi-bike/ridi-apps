import { createClient, User } from "@supabase/supabase-js";
import { createMiddleware } from "hono/factory";
import postgres from "postgres";
import { Database } from "./supabase";
import { Messaging } from "./messaging";
import { RidiLogger } from "./logging";

RidiLogger.init("cfw-api");
const ridiLogger = RidiLogger.get();

export type Variables = {
  Variables: {
    supabaseClient: ReturnType<
      typeof createClient<Database, "public", Database["public"]>
    >;
    db: ReturnType<typeof postgres>;
    messaging: Messaging;
    loggger: RidiLogger;
    user: User;
  };
};

type FullContext = { Bindings: CloudflareBindings } & Variables;

export const loggerMiddleware = createMiddleware(async (c, next) => {
  c.set("logger", ridiLogger);
  await next();
});

export const timingMiddleware = createMiddleware<{
  Variables: { logger: RidiLogger };
}>(async (c, next) => {
  const startMs = Date.now();
  await next();
  c.var.logger.info("Req finished", { ms: Date.now() - startMs });
});

export const contextMiddleware = createMiddleware(async (c, next) => {
  const supabaseClient = createClient<Database, "public", Database["public"]>(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const db = postgres(c.env.SUPABASE_DB_URL);

  const messaging = new Messaging(db, ridiLogger);

  c.set("supabaseClient", supabaseClient);
  c.set("db", db);
  c.set("messaging", messaging);
  await next();
});

export const netAddrActivityMiddleware = createMiddleware<FullContext>(
  async (c, next) => {
    const netAddr = c.req.header("CF-Connecting-IP");
    if (netAddr) {
      await c.var.messaging.send("net-addr-activity", {
        netAddr,
      });
    }
    await next();
  },
);

export const userMiddleware = createMiddleware<FullContext>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.replace("Bearer ", "") || "";
  const { data } = await c.var.supabaseClient.auth.getUser(token);
  const user = data.user;
  if (!user) {
    c.status(401);
    return c.text("Unauthorized");
  }
  c.set("user", user);
  await next();
});
