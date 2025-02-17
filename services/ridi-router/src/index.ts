import Fastify from "fastify";
import { initServer } from "@ts-rest/fastify";
import { ridiRouterContract } from "@ridi/ridi-router-contracts";
import { RouterServer } from "./router-server";

const app = Fastify();

const s = initServer();

const routerServer = new RouterServer();

const router = s.router(ridiRouterContract, {
  healthcheck: () => {
    return {
      status: 200,
      body: {
        routerVersion: "omg",
        running: true,
      },
    };
  },
});

app.register(s.plugin(router));

const start = async () => {
  try {
    await app.listen({ port: 3000 });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
