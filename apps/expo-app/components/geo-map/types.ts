import  { type PropsWithChildren } from "react";

export type GeoMapProps = {
	start?: Coords | null;
	finish?: Coords | null;
	current?: Coords | null;
	points?: MapPoint[];
	initialFindCoords?: Coords | null;
	setStart?: (coords: Coords) => void;
	setFinish?: (cords: Coords) => void;
	route?: Coords[];
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
