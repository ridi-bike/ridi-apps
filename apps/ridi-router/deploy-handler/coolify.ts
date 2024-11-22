import { parse, string } from "valibot";

const coolifyUrl = parse(
  string("COOLIFY_API_URL env variable"),
  Deno.env.get("COOLIFY_API_URL"),
);
const coolifyToken = parse(
  string("COOLIFY_TOKEN env variable"),
  Deno.env.get("COOLIFY_TOKEN"),
);
const coolifyIdRouterHandler = parse(
  string("COOLIFY_DEPLOYMENT_ID_ROUTER_HANDLER env variable"),
  Deno.env.get("COOLIFY_DEPLOYMENT_ID_ROUTER_HANDLER"),
);
const coolifyIdMapDataHandler = parse(
  string("COOLIFY_DEPLOYMENT_ID_MAP_DATA_HANDLER env variable"),
  Deno.env.get("COOLIFY_DEPLOYMENT_ID_MAP_DATA_HANDLER"),
);
export const coolify = {
  async deployRouterHandler() {
    await fetch(`${coolifyUrl}/deploy?uuid=${coolifyIdRouterHandler}`, {
      headers: {
        Authorization: `Bearer ${coolifyToken}`,
      },
    });
  },
  async deployMapDataHandler() {
    await fetch(`${coolifyUrl}/deploy?uuid=${coolifyIdMapDataHandler}`, {
      headers: {
        Authorization: `Bearer ${coolifyToken}`,
      },
    });
  },
};
