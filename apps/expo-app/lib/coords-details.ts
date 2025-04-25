import { coordsDetailsGetAndFormat } from "@ridi/maps-api";

import { type Coords } from "~/components/geo-map/types";

const apiUrl = process.env.EXPO_PUBLIC_API_URL;
if (!apiUrl) {
  throw new Error("API URL missing in EXPO_PUBLIC_API_URL");
}

type GeoBoundariesResp = [
  {
    name: string;
    level: number;
  },
];

async function getCoordsDetailsFromGeoBoundaries(coords: Coords) {
  return (await fetch(
    `${apiUrl}/geo-boundaries?lat=${coords.lat}&lon=${coords.lon}`,
  ).then((r) => r.json())) as GeoBoundariesResp;
}

const coordsAddrCache = new Map<string, string>();
function getKey(coords: Coords): string {
  return `${Math.round(Number(coords.lat) * 1000)}${Math.round(Number(coords.lon) * 1000)}`;
}
export function coordsAddressCacheInsert(coords: Coords, address: string) {
  coordsAddrCache.set(getKey(coords), address);
}

export async function coordsAddressGet(coords: Coords): Promise<string> {
  const fromCache = coordsAddrCache.get(getKey(coords));

  console.log("coordsAddressGet", { fromCache });
  if (fromCache) {
    return fromCache;
  }
  const fromLookup = await coordsDetailsGetAndFormat(
    coords,
    getCoordsDetailsFromGeoBoundaries,
  );
  console.log("coordsAddressGet", { fromLookup });
  coordsAddressCacheInsert(coords, fromLookup);
  return fromLookup;
}
