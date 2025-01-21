import { array, parse, string } from "valibot";

import { BaseEnvVariables } from "@ridi-router/env/main.ts";

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
    string("SUPABASE_DB_URL env variable"),
    Deno.env.get("SUPABASE_DB_URL"),
  );

  readonly osmDataBaseUrl = parse(
    string("OSM_DATA_BASE_URL env variable"),
    Deno.env.get("OSM_DATA_BASE_URL"),
  );

  readonly regions: string[];

  constructor() {
    super();
    this.regions = parse(
      array(string("region list file read")),
      JSON.parse(Deno.readTextFileSync(this.regionListLoc)),
    );
  }
}
