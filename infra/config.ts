import * as pulumi from "@pulumi/pulumi";

import allRegions from "./all-regions.json";
import { type K8sNode } from "./types";

const config = new pulumi.Config();

export const ridiInfraVersion = Date.now();

export const routerVersion = "v0.7.0";
export const routerVersionNext = "v0.7.0";

export const mapDataVersionDate = "2025-02-19";
export const mapDataVersionDateNext = "2025-02-19";

export const ridiDataRootPath = "/ridi-data";

export const volumeSizeMemoryMultiplier = 5;

export function getMapDataLocation(region: string, dataVersion: string) {
  return `${ridiDataRootPath}/map-data/${dataVersion}/${region}`;
}
export function getPbfRemoteUrl(region: string) {
  return `https://download.geofabrik.de/${region}-latest.osm.pbf`;
}
export function getKmlRemoteUrl(region: string) {
  return `https://download.geofabrik.de/${region}.kml`;
}
export function getPbfLocation(region: string, dataVersion: string) {
  return `${getMapDataLocation(region, dataVersion)}/map.osm.pbf`;
}
export function getKmlLocation(region: string, dataVersion: string) {
  return `${getMapDataLocation(region, dataVersion)}/map.kml`;
}
export function getCacheLocation(region: string, dataVersion: string) {
  return `${ridiDataRootPath}/cache/${routerVersion}/${dataVersion}/${region}`;
}

export type Region = (typeof allRegions)[number];

const selectedRegions = config.getObject<string[]>("regions_selected");
export const regions = selectedRegions
  ? allRegions.filter((r) => selectedRegions.includes(r.region))
  : allRegions;

export const nodes: Record<string, K8sNode> =
  config.requireObject("cluster_nodes");
