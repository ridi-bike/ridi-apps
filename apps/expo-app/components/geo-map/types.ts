import { type PropsWithChildren } from "react";

export type GeoMapRouteViewProps = {
  route: Coords[];
  interactive: boolean;
};
export type GeoMapCoordsSelectorProps = {
  isRoundTrip: boolean;
  start?: Coords | null;
  finish?: Coords | null;
  current?: Coords | null;
  points?: MapPoint[];
  setStart: (coords: Coords | null) => void;
  setFinish: (cords: Coords | null) => void;
  bearing?: number;
  distance?: number;
  selectionMode: "tap" | "center";
};

export type Coords = {
  lat: number;
  lon: number;
};

export type MapPoint = {
  coords: Coords;
};

export type GeoMapMarkerProps = PropsWithChildren<{
  lat: number;
  lon: number;
}>;
