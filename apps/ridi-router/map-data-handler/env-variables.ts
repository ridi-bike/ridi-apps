import { array, parse, string } from "valibot";

import { BaseEnvVariables } from "@ridi-router/lib";

export class EnvVariables extends BaseEnvVariables {
  private static instance: EnvVariables;

  readonly routerBin = parse(
    string("RIDI_ROUTER_BIN env variable"),
    Deno.env.get("RIDI_ROUTER_BIN"),
  );

  readonly routerVersion = parse(
    string("RIDI_ROUTER_VERSION env variable"),
    Deno.env.get("RIDI_ROUTER_VERSION"),
  );

  readonly supabaseDbUrl = parse(
    string(),
    Deno.env.get("SUPABASE_DB_URL"),
  );

  readonly regions: string[];

  private constructor() {
    super();
    this.regions = parse(
      array(string()),
      JSON.parse(Deno.readTextFileSync(this.regionListLoc)),
    );
  }

  public static get(): EnvVariables {
    if (!EnvVariables.instance) {
      EnvVariables.instance = new EnvVariables();
    }
    return EnvVariables.instance;
  }
}
