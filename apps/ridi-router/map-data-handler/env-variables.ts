import { array, parse, string } from "valibot";

import { locations } from "@ridi-router/lib";

export const routerBin = parse(
  string("RIDI_ROUTER_BIN env variable"),
  Deno.env.get("RIDI_ROUTER_BIN"),
);

export const routerVersion = parse(
  string("RIDI_ROUTER_VERSION env variable"),
  Deno.env.get("RIDI_ROUTER_VERSION"),
);

export const regions = parse(
  array(string()),
  JSON.parse(Deno.readTextFileSync(locations.getRegionListFileLoc())),
);

export const supabaseDbUrl = parse(
  string(),
  Deno.env.get("SUPABASE_DB_URL"),
);
