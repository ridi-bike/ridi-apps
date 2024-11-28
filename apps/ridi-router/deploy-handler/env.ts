import { parse, string } from "valibot";

export const routerVersion = parse(
  string("RIDI_ROUTER_VERSION env variable"),
  Deno.env.get("RIDI_ROUTER_VERSION"),
);
