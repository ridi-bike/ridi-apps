import { parse, string } from "valibot";
import { BaseEnvVariables } from "@ridi-router/env/main.ts";

export class EnvVariables extends BaseEnvVariables {
  private static instance: EnvVariables;

  readonly routerVersion: string = parse(
    string("RIDI_ROUTER_VERSION env variable"),
    Deno.env.get("RIDI_ROUTER_VERSION"),
  );

  readonly coolifyUrl: string = parse(
    string("COOLIFY_API_URL env variable"),
    Deno.env.get("COOLIFY_API_URL"),
  );

  readonly coolifyToken: string = parse(
    string("COOLIFY_TOKEN env variable"),
    Deno.env.get("COOLIFY_TOKEN"),
  );

  readonly coolifyIdRouterHandler: string = parse(
    string("COOLIFY_DEPLOYMENT_ID_ROUTER_HANDLER env variable"),
    Deno.env.get("COOLIFY_DEPLOYMENT_ID_ROUTER_HANDLER"),
  );

  readonly coolifyIdMapDataHandler: string = parse(
    string("COOLIFY_DEPLOYMENT_ID_MAP_DATA_HANDLER env variable"),
    Deno.env.get("COOLIFY_DEPLOYMENT_ID_MAP_DATA_HANDLER"),
  );

  private constructor() {
    super();
  }

  public static get(): EnvVariables {
    if (!EnvVariables.instance) {
      EnvVariables.instance = new EnvVariables();
    }
    return EnvVariables.instance;
  }
}
