import { literal, parse, string, union } from "valibot";

export const ridiEnv = parse(
  union([literal("local"), literal("prod")]),
  Deno.env.get("RIDI_ENV"),
);

export const ridiEnvName = parse(
  union([
    literal("deploy-handler"),
    literal("map-data-handler"),
    literal("router-handler"),
  ]),
  Deno.env.get("RIDI_ENV_NAME"),
);

export const openObserveOrg = parse(
  string(),
  Deno.env.get("OPEN_OBSERVE_ORG"),
);

export const openObserveToken = parse(
  string(),
  Deno.env.get("OPEN_OBSERVE_TOKEN"),
);
