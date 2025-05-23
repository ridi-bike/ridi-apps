import * as pulumi from "@pulumi/pulumi";

import allRegions from "./all-regions.json";
import { type K8sNode } from "./types";

const config = new pulumi.Config();

export const ridiInfraVersion = Date.now();

export const routerVersion = "v0.7.3";
export const routerVersionNext = "v0.7.3";

export const mapDataVersionDate = "2025-02-19";
export const mapDataVersionDateNext = "2025-05-22";

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

const regionPlanCount = {
  "asia/indonesia": 1,
  "australia-oceania/australia": 10,
  "europe/alps": 2,
  "europe/austria": 2,
  "europe/belgium": 4,
  "europe/denmark": 1,
  "europe/estonia": 3,
  "europe/finland": 4,
  "europe/france": 7,
  "europe/germany": 18,
  "europe/great-britain": 12,
  "europe/greece": 18,
  "europe/italy": 6,
  "europe/latvia": 70,
  "europe/lithuania": 6,
  "europe/netherlands": 13,
  "europe/norway": 2,
  "europe/poland": 2,
  "europe/portugal": 6,
  "europe/romania": 3,
  "europe/slovenia": 1,
  "europe/spain": 3,
  "europe/sweden": 7,
  "europe/switzerland": 1,
  "north-america/canada/alberta": 12,
  "north-america/canada/british-columbia": 4,
  "north-america/canada/manitoba": 2,
  "north-america/canada/new-brunswick": 1,
  "north-america/canada/ontario": 5,
  "north-america/canada/quebec": 3,
  "north-america/mexico": 1,
  "north-america/us-midwest": 34,
  "north-america/us-northeast": 39,
  "north-america/us-south": 41,
  "north-america/us-west": 120,
} as Record<string, number>;

const regionSizes = [
  { from: 0, to: 1, label: "xs" },
  { from: 2, to: 10, label: "s" },
  { from: 11, to: 50, label: "m" },
  { from: 51, to: Infinity, label: "l" },
];

export function getRouterActivityLevel(region: string): string {
  const planCount = regionPlanCount[region] || 0;
  return (
    regionSizes.find((size) => size.from <= planCount && size.to >= planCount)
      ?.label || "unknown"
  );
}
