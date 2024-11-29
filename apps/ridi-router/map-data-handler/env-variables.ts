import { array, parse, string } from "valibot";

import { BaseEnvVariables } from "@ridi-router/lib";

export class EnvVariables extends BaseEnvVariables {
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

  constructor() {
    super();
    this.regions = parse(
      array(string()),
      JSON.parse(Deno.readTextFileSync(this.regionListLoc)),
    );
  }
}

export const envVariables = new EnvVariables();
