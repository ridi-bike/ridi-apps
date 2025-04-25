import { lookupCooordsInfoNominatim } from "./nominatim-api";

export type Coords = {
  lat: number;
  lon: number;
};

export async function coordsDetailsGetAndFormat(
  coords: Coords,
  coordsDetailsGetter: (
    coords: Coords,
  ) => Promise<{ name: string; level: number }[]>,
): Promise<string> {
  const coordsDetails = await coordsDetailsGetter(coords);
  if (coordsDetails.length) {
    return coordsDetails
      .sort((a, b) => b.level - a.level)
      .map((v) => v.name)
      .filter(
        (_, i) =>
          i === 0 ||
          i === coordsDetails.length - 1 ||
          (coordsDetails.length > 2 &&
            i === Math.round(coordsDetails.length / 2)),
      )
      .join(", ");
  }
  return lookupCooordsInfoNominatim(coords);
}
