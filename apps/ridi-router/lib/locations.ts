import { BaseEnvVariables } from "./env.ts";

export class Locations {
  constructor(private readonly baseEnvVariables: BaseEnvVariables) {}

  getDbFileLoc(): string {
    const loc = `${this.baseEnvVariables.dataDir}/db`;
    try {
      Deno.mkdirSync(loc, { recursive: true });
    } catch (err) {
      if (!(err instanceof Deno.errors.AlreadyExists)) {
        throw err;
      }
    }
    return `${loc}/sqlite.db`;
  }

  async getCacheDirLoc(
    region: string,
    routerVersion: string,
    pbfMd5: string,
  ): Promise<string> {
    const loc =
      `${this.baseEnvVariables.dataDir}/cache/${routerVersion}/${region}/${pbfMd5}`;
    try {
      await Deno.mkdir(loc, { recursive: true });
    } catch (err) {
      if (!(err instanceof Deno.errors.AlreadyExists)) {
        throw err;
      }
    }
    return loc;
  }

  async getPbfFileLoc(region: string, md5: string): Promise<string> {
    const loc = `${this.baseEnvVariables.dataDir}/pbf/${region}/${md5}`;
    try {
      await Deno.mkdir(loc, { recursive: true });
    } catch (err) {
      if (!(err instanceof Deno.errors.AlreadyExists)) {
        throw err;
      }
    }
    return `${loc}/osm.pbf`;
  }

  async getKmlLocation(region: string, md5: string): Promise<string> {
    const loc = `${this.baseEnvVariables.dataDir}/pbf/${region}/${md5}`;
    try {
      await Deno.mkdir(loc, { recursive: true });
    } catch (err) {
      if (!(err instanceof Deno.errors.AlreadyExists)) {
        throw err;
      }
    }
    return `${loc}/osm.kml`;
  }
}
