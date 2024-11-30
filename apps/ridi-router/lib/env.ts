import { literal, parse, string, union } from "valibot";

export class BaseEnvVariables {
  private static instance: BaseEnvVariables;

  readonly ridiEnv = parse(
    union([literal("local"), literal("prod")]),
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
    string(),
    Deno.env.get("OPEN_OBSERVE_ORG"),
  );

  readonly openObserveToken = parse(
    string(),
    Deno.env.get("OPEN_OBSERVE_TOKEN"),
  );

  readonly regionListLoc = parse(
    string(),
    Deno.env.get("REGION_LIST"),
  );

  readonly dataDir = parse(
    string(),
    Deno.env.get("RIDI_DATA_DIR"),
  );
  private constructor() {}

  public static get(): BaseEnvVariables {
    if (!BaseEnvVariables.instance) {
      BaseEnvVariables.instance = new BaseEnvVariables();
    }
    return BaseEnvVariables.instance;
  }
}
