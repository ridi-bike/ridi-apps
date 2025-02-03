import { StatOptions } from "node:fs";

export interface ReverseGeocodingResponse {
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
}

export interface Address {
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
}

export interface Extratags {
  capital: string;
  website: string;
  wikidata: string;
  wikipedia: string;
  population: string;
}

function formatCountryDiff(coords: ReverseGeocodingResponse): string {
  return `${coords.address.city || coords.address.state || coords.address.state_district}, ${coords.address.country}`;
}
function formatCityDiff(coords: ReverseGeocodingResponse): string {
  return `${coords.address.city || coords.address.town}, ${coords.address.state_district}`;
}
function formatCitySame(coords: ReverseGeocodingResponse): string {
  return `${coords.address.isolated_dwelling || coords.address.road}, ${coords.address.city || coords.address.town}`;
}
export async function lookupCooordsInfo(
  coords: [[string, string], [string, string]],
): Promise<[string, string]> {
  try {
    const coordsDetails = (await Promise.all(
      coords.map((c) =>
        fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${c[0]}&lon=${c[1]}&format=json`,
        ).then((r) => r.json()),
      ),
    )) as [ReverseGeocodingResponse, ReverseGeocodingResponse];
    const coordsOne = coordsDetails[0];
    const coordsTwo = coordsDetails[1];
    if (coordsOne.address.country !== coordsTwo.address.country) {
      return [formatCountryDiff(coordsOne), formatCountryDiff(coordsTwo)];
    }
    if (
      (coordsOne.address.city || coordsOne.address.town) !==
      (coordsTwo.address.city || coordsTwo.address.town)
    ) {
      return [formatCityDiff(coordsOne), formatCityDiff(coordsTwo)];
    }
    return [formatCitySame(coordsOne), formatCitySame(coordsTwo)];
  } catch (error) {
    return coords.map((c) => `${c[0]},${c[1]}`);
  }
}
