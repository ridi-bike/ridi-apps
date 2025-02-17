import { literal, parse, string, union } from "valibot";

export class BaseEnvVariables {
  readonly ridiEnv = parse(
    union([literal("test"), literal("local"), literal("prod")]),
    Deno.env.get("RIDI_ENV"),
  );

  readonly ridiEnvName = parse(
    union([
      literal("deploy-handler"),
      literal("map-data-handler"),
      literal("router-handler"),
    ]),
    Deno.env.get("RIDI_ENV_NAME"),
  );

  readonly supabaseDbUrl = parse(
    string("SUPABASE_DB_URL env variable"),
    Deno.env.get("SUPABASE_DB_URL"),
  );

  readonly regionListLoc = parse(
    string("REGION_LIST env variable"),
    Deno.env.get("REGION_LIST"),
  );

  readonly dataDir = parse(
    string("RIDI_DATA_DIR env variable"),
    Deno.env.get("RIDI_DATA_DIR"),
  );

  readonly port = parse(
    string("PORT env variable"),
    Deno.env.get("PORT"),
  );
}
