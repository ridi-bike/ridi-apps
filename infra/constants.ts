import { K8sNode, Region } from "./types";

export const routerVersion = "v0.6.20";

export const mapDataDateVersion = "2025-02-19";

export const ridiDataRootPath = "/ridi-data";

export const volumeSizeMemoryMultiplier = 5;

export function getMapDataLocation(region: string) {
  return `${ridiDataRootPath}/map-data/${mapDataDateVersion}/${region}`;
}
export function getPbfRemoteUrl(region: string) {
  return `https://download.geofabrik.de/${region}-latest.osm.pbf`;
}
export function getKmlRemoteUrl(region: string) {
  return `https://download.geofabrik.de/${region}.html`;
}
export function getPbfLocation(region: string) {
  return `${getMapDataLocation(region)}/map.osm.pbf`;
}
export function getKmlLocation(region: string) {
  return `${getMapDataLocation(region)}/map.kml`;
}
export function getCacheLocation(region: string) {
  return `${ridiDataRootPath}/cache/${routerVersion}/${mapDataDateVersion}/${region}`;
}

export const regions: Region[] = [
  { name: "europe/latvia", memory: 300 },
  { name: "europe/greece", memory: 300 },
];

export function getRegionNameSafe(region: Region): string {
  return region.name.replace(/[\W_]+/g, "-");
}

export const nodes: K8sNode[] = [
  {
    name: "arch-l13",
    labels: {
      "node-role.kubernetes.io/control-plane": "true",
      "node-role.kubernetes.io/master": "true",
      "node-role.kubernetes.io/worker": "true",
      "node.longhorn.io/create-default-disk": "true",
    },
  },
];
