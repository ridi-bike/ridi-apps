import { array, integer, parse, pipe, string, transform } from "valibot";

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

  readonly supabaseUrl = parse(
    string("SUPABASE_URL env variable"),
    Deno.env.get("SUPABASE_URL"),
  );

  readonly supabaseSecretKey = parse(
    string("SUPABASE_SECRET_KEY env variable"),
    Deno.env.get("SUPABASE_SECRET_KEY"),
  );

  readonly serverAvailMemoryMb = parse(
    pipe(
      string("SERVER_AVAIL_MEMORY env variable"),
      transform(Number),
      integer(),
    ),
    Deno.env.get("SERVER_AVAIL_MEMORY"),
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
