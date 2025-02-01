import { Hono } from "hono";
import { z } from "zod";
import {
  contextMiddleware,
  loggerMiddleware,
  netAddrActivityMiddleware,
  timingMiddleware,
  userMiddleware,
  Variables,
} from "./middlewares";
import { zValidator } from "@hono/zod-validator";
import { planCreate, planList, routesGet } from "./queries_sql";
import { addRouteHandlers } from "./routes/routes";
import { addPlanHandlers } from "./routes/plans";
import { addCoordsHandler } from "./routes/coords";

const app = new Hono<{ Bindings: CloudflareBindings } & Variables>();

app.use(loggerMiddleware);
app.use(timingMiddleware);
app.use(contextMiddleware);
app.use(netAddrActivityMiddleware);
app.use("/user/*", userMiddleware);

addPlanHandlers(app);
addRouteHandlers(app);
addCoordsHandler(app);

app.get("/", (c) => {
  return c.text("Hello Ridi!");
});

export default app;
