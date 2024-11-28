import { literal, parse, union } from "valibot";

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
