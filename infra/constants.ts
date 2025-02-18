export const routerVersion = "v0.6.20";

export const mapDataDateVersion = "2025-02-19";

export const ridiDataRootPath = "/ridi-data";

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
