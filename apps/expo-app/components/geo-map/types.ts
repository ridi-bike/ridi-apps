import { type PropsWithChildren } from "react";

export type GeoMapRouteViewProps = {
  route: Coords[];
};
export type GeoMapCoordsSelectorProps = {
  isRoundTrip: boolean;
  start?: Coords | null;
  finish?: Coords | null;
  current?: Coords | null;
  points?: MapPoint[];
  findCoords?: boolean;
  setStart: (coords: Coords | null) => void;
  setFinish: (cords: Coords | null) => void;
  bearing?: number;
  distance?: number;
};

export type Coords = {
  lat: number;
  lon: number;
};

export type MapPoint = {
  title: string;
  description: string;
  coords: Coords;
};

export type GeoMapMarkerProps = PropsWithChildren<{
  lat: number;
  lon: number;
}>;
