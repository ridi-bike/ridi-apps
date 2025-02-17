import { EnvVariables } from "./env-variables.ts";

export class OsmLocations {
  constructor(private readonly env: EnvVariables) {
  }
  getKmlFileLocRemote(region: string): string {
    return `${this.env.osmDataBaseUrl}/${region}.kml`;
  }
  getMd5FileLocRemote(region: string): string {
    return `${this.env.osmDataBaseUrl}/${region}-latest.osm.pbf.md5`;
  }
  getPbfFileLocRemote(region: string): string {
    return `${this.env.osmDataBaseUrl}/${region}-latest.osm.pbf`;
  }
}
