import { CoolifyClient } from "./coolify.ts";
import type { RidiLogger } from "@ridi-router/logging/main.ts";
import { EnvVariables } from "./env.ts";
import { pg, PgClient } from "@ridi-router/lib";

export class DeployChecker {
  private deployed = {
    mapDataHandler: false,
    routerHandler: false,
  };
  private checkInterval: number | null = null;

  constructor(
    private readonly db: typeof pg,
    private readonly pgClient: PgClient,
    private readonly coolify: CoolifyClient,
    private readonly envVariables: EnvVariables,
    private readonly logger: RidiLogger,
  ) {
  }

  async checkDeploy() {
    await this.db.servicesUpdateRecordProcessing(this.pgClient, {
      name: "deploy",
    });

    const mapDataHandler = await this.db.servicesGet(this.pgClient, {
      name: "map-data",
    });
    const routerHandler = await this.db.servicesGet(this.pgClient, {
      name: "router",
    });

    this.logger.debug("Checking map data handler", { ...mapDataHandler });

    if (!this.deployed.mapDataHandler) {
      await this.coolify.deployMapDataHandler();
      this.deployed.mapDataHandler = true;
      this.logger.debug("Map data handler deployment triggered");
    }

    this.logger.debug("Checking router handler", { ...routerHandler });

    if (
      !this.deployed.routerHandler &&
      this.deployed.mapDataHandler &&
      mapDataHandler?.routerVersion === this.envVariables.routerVersion &&
      mapDataHandler?.status === "done"
    ) {
      await this.coolify.deployRouterHandler();
      this.deployed.routerHandler = true;
      this.logger.debug("Router handler deployment triggered");
    }

    if (
      this.deployed.routerHandler && this.deployed.mapDataHandler &&
      this.checkInterval !== null
    ) {
      this.logger.debug("Deployments done, clearing check interval");
      clearInterval(this.checkInterval);
      await this.db.servicesUpdateRecordDone(this.pgClient, { name: "deploy" });
    }
  }

  start() {
    this.checkInterval = setInterval(() => this.checkDeploy(), 60 * 1000);
  }
}
