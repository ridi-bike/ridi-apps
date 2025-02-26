import * as pulumi from "@pulumi/pulumi";

import allRegions from "./all-regions.json";
import { type K8sNode } from "./types";

const config = new pulumi.Config();

export const ridiInfraVersion = Date.now();

export const routerVersion = "v0.6.20";
export const routerVersionNext = "v0.6.20";

export const mapDataVersionDate = "2025-02-19";

export const ridiDataRootPath = "/ridi-data";

export const volumeSizeMemoryMultiplier = 5;

export function getMapDataLocation(region: string) {
  return `${ridiDataRootPath}/map-data/${mapDataVersionDate}/${region}`;
}
export function getPbfRemoteUrl(region: string) {
  return `https://download.geofabrik.de/${region}-latest.osm.pbf`;
}
export function getKmlRemoteUrl(region: string) {
  return `https://download.geofabrik.de/${region}.kml`;
}
export function getPbfLocation(region: string) {
  return `${getMapDataLocation(region)}/map.osm.pbf`;
}
export function getKmlLocation(region: string) {
  return `${getMapDataLocation(region)}/map.kml`;
}
export function getCacheLocation(region: string) {
  return `${ridiDataRootPath}/cache/${routerVersion}/${mapDataVersionDate}/${region}`;
}

export type Region = (typeof allRegions)[number];

const selectedRegions = config.getObject<string[]>("regions_selected");
export const regions = selectedRegions
  ? allRegions.filter((r) => selectedRegions.includes(r.region))
  : allRegions;

export const nodes: Record<string, K8sNode> =
  config.requireObject("cluster_nodes");
