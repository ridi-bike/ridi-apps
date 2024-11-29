import { getDb, RidiLogger } from "@ridi-router/lib";
import { CoolifyClient } from "./coolify.ts";
import { EnvVariables } from "./env.ts";

export class DeployChecker {
  private deployed = {
    mapDataHandler: false,
    routerHandler: false,
  };
  private checkInterval: number | null = null;

  constructor(
    private readonly db: ReturnType<typeof getDb>,
    private readonly coolify: CoolifyClient,
    private readonly envVariables: EnvVariables,
    private readonly logger: RidiLogger,
  ) {
  }

  async checkDeploy() {
    this.db.handlers.updateRecordProcessing("deploy");

    const mapDataHandler = this.db.handlers.get("map-data");
    const routerHandler = this.db.handlers.get("router");

    this.logger.debug("Checking map data handler", { ...mapDataHandler });

    if (!this.deployed.mapDataHandler && mapDataHandler?.status === "done") {
      await this.coolify.deployMapDataHandler();
      this.deployed.mapDataHandler = true;
      this.logger.debug("Map data handler deployment triggered");
    }

    this.logger.debug("Checking router handler", { ...routerHandler });

    if (
      !this.deployed.routerHandler &&
      this.deployed.mapDataHandler &&
      mapDataHandler?.router_version === this.envVariables.routerVersion &&
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
      this.db.handlers.updateRecordDone("deploy");
    }
  }

  start() {
    this.checkInterval = setInterval(() => this.checkDeploy(), 60 * 1000);
  }
}
