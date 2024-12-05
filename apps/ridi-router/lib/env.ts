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

  readonly openObserveOrg = parse(
    string("OPEN_OBSERVE_ORG env variable"),
    Deno.env.get("OPEN_OBSERVE_ORG"),
  );

  readonly openObserveToken = parse(
    string("OPEN_OBSERVE_TOKEN env variable"),
    Deno.env.get("OPEN_OBSERVE_TOKEN"),
  );

  readonly regionListLoc = parse(
    string("REGION_LIST env variable"),
    Deno.env.get("REGION_LIST"),
  );

  readonly dataDir = parse(
    string("RIDI_DATA_DIR env variable"),
    Deno.env.get("RIDI_DATA_DIR"),
  );
}
