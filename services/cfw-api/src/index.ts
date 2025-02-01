import { Hono } from "hono";
import {
  contextMiddleware,
  loggerMiddleware,
  netAddrActivityMiddleware,
  timingMiddleware,
  userMiddleware,
  Variables,
} from "./middlewares";
import { addRouteHandlers } from "./routes/routes";
import { addPlanHandlers } from "./routes/plans";
import { addCoordsHandler } from "./routes/coords";

const app = new Hono<{ Bindings: CloudflareBindings } & Variables>();

app.use(loggerMiddleware);
app.use(timingMiddleware);
app.use(contextMiddleware);
app.use(netAddrActivityMiddleware);
app.use("/user/*", userMiddleware);

const appWithPlanRoutes = addPlanHandlers(app);
const appWithRouteRoutes = addRouteHandlers(appWithPlanRoutes);
const appWithCoordsRoutes = addCoordsHandler(appWithRouteRoutes);

const fullApp = appWithCoordsRoutes.get("/", (c) => {
  return c.text("Hello Ridi!");
});

export default app;

export type RidiHonoApp = typeof fullApp;
