import { type Region } from "@ridi/store-with-schema";
import { type PropsWithChildren } from "react";

export type GeoMapCoordsSelectorProps = {
  isRoundTrip: boolean;
  start?: Coords | null;
  finish?: Coords | null;
  current?: Coords | null;
  points?: MapPoint[];
  setStart: (coords: Coords | null) => void;
  setFinish: (cords: Coords | null) => void;
  onCoordsSelectCancel?: () => void;
  bearing?: number;
  distance?: number;
  selectionMode: "tap" | "center";
  regions?: Region[] | null;
  children: React.ReactNode;
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
