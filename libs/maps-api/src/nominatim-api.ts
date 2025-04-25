import { type Coords } from "./index.ts";

type ReverseGeocodingResponseOk = {
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

type ReverseGeocodingResponseError = {
  error: string;
};

type ReverseGeocodingResponse =
  | ReverseGeocodingResponseOk
  | ReverseGeocodingResponseError;

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

function isRespOk(
  resp: ReverseGeocodingResponse,
): resp is ReverseGeocodingResponseOk {
  if ((resp as ReverseGeocodingResponseError).error) {
    return false;
  }
  return true;
}

function getCityLoc(coords: ReverseGeocodingResponse): string {
  if (!isRespOk(coords)) {
    return "Unknown";
  }

  return `${coords.address.city || coords.address.town || coords.address.state || coords.address.state_district || coords.address.village || coords.address.municipality}`;
}

export async function lookupCooordsInfoNominatim(
  coords: Coords,
): Promise<string> {
  const coordsDetails = (await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lon}&format=json`,
    {
      headers: {
        Referer: "https://app.ridi.bike",
      },
    },
  ).then((r) => r.json())) as ReverseGeocodingResponse;

  return getCityLoc(coordsDetails);
}
