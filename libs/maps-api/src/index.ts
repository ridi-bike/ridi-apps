type Coords = [string, string];
const coordsAddrCache = new Map<string, string>();
function getKey(coords: Coords): string {
  return `${Math.round(Number(coords[0]) * 1000)}${Math.round(Number(coords[1]) * 1000)}`;
}
export function coordsAddressCacheInsert(coords: Coords, address: string) {
  coordsAddrCache.set(getKey(coords), address);
}

export async function coordsAddressGet(coords: Coords): Promise<string> {
  const fromCache = coordsAddrCache.get(getKey(coords));
  if (fromCache) {
    return fromCache;
  }
  const fromLookup = await lookupCooordsInfo([coords, null]);
  coordsAddressCacheInsert(coords, fromLookup[0]);
  return fromLookup[0];
}

type ReverseGeocodingResponse = {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: string;
  boundingbox: string[];
  lat: string;
  lon: string;
  display_name: string;
  class: string;
  type: string;
  importance: number;
  icon: string;
  address: Address;
  extratags: Extratags;
};

type Address = {
  city?: string;
  state_district: string;
  state: string;
  "ISO3166-2-lvl4": string;
  postcode: string;
  country: string;
  country_code: string;
  town?: string;
  road?: string;
  house_number?: string;
  isolated_dwelling?: string;
  neighbourhood?: string;
  village?: string;
  municipality?: string;
  county?: string;
};

type Extratags = {
  capital: string;
  website: string;
  wikidata: string;
  wikipedia: string;
  population: string;
};

function getCityLoc(coords: ReverseGeocodingResponse): string {
  return `${coords.address.city || coords.address.town || coords.address.state || coords.address.state_district || coords.address.village || coords.address.municipality}`;
}

function formatCityDiff(coords: ReverseGeocodingResponse): string {
  return `${getCityLoc(coords)}, ${coords.address.country}`;
}
function formatCitySame(coords: ReverseGeocodingResponse): string {
  const partOne =
    coords.address.isolated_dwelling ||
    coords.address.road ||
    coords.address.postcode;
  return `${partOne ? partOne + ", " : ""}${getCityLoc(coords)}`;
}
export async function lookupCooordsInfo(
  coords: [[string, string], null | [string, string]],
): Promise<[string, null | string]> {
  const coordsDetails = (await Promise.all(
    coords.map((c) => {
      if (!c) {
        return null;
      }
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${c[0]}&lon=${c[1]}&format=json`;
      return fetch(url, {
        headers: {
          Referer: "https://app.ridi.bike",
        },
      }).then((r) => r.json());
    }),
  )) as [ReverseGeocodingResponse, null | ReverseGeocodingResponse];
  const coordsOne = coordsDetails[0];
  const coordsTwo = coordsDetails[1];
  if (!coordsTwo) {
    return [formatCitySame(coordsOne), null];
  }
  if (getCityLoc(coordsOne) !== getCityLoc(coordsTwo)) {
    return [formatCityDiff(coordsOne), formatCityDiff(coordsTwo)];
  }
  return [formatCitySame(coordsOne), formatCitySame(coordsTwo)];
}
