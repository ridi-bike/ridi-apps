import { getMapStyle } from "@ridi/geo-maps";
import * as turf from "@turf/turf";
import {
  type FillLayer,
  Layer,
  Map as MapLibre,
  NavigationControl,
  Source,
  type MapRef,
} from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  CircleDotIcon,
  CircleFadingPlusIcon,
  CirclePauseIcon,
  CirclePlayIcon,
  CircleUserIcon,
} from "lucide-react-native";
import maplibre from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";

import { MapMarker } from "~/components/geo-map/marker";
import {
  type Coords,
  type GeoMapCoordsSelectorProps,
} from "~/components/geo-map/types";
import { useColorScheme } from "~/lib/useColorScheme";

import { combineBBox, useRoundTripPolygon } from "./util";

const colors = [
  "#dc2626",
  "#16a34a",
  "#ea580c",
  "#eab308",
  "#db2777",
  "#9333ea",
  "#057aff",
  "#c026d3",
  "#ca8a04",
  "#059669",
];

function stringToColor(str: string) {
  const hash = str.split("").reduce((tot, char) => tot + char.charCodeAt(0), 0);

  const colorIndex = Math.abs(hash) % colors.length;

  return colors[colorIndex];
}

export function GeoMapCoordsSelector({
  start,
  finish,
  current,
  points,
  selectionMode,
  setStart,
  setFinish,
  isRoundTrip,
  bearing,
  distance,
  regions,
  children,
}: GeoMapCoordsSelectorProps) {
  const { colorScheme } = useColorScheme();
  const mapRef = useRef<MapRef>(null);

  const [findCoordsCurr, setFindCoordsCurr] = useState<
    (Coords & { tapped?: boolean }) | null
  >(null);

  useEffect(() => {
    if (selectionMode === "center") {
      const coords = mapRef.current?.getCenter();
      if (coords) {
        setFindCoordsCurr({
          lat: Math.round(coords.lat * 100000) / 100000,
          lon: Math.round(coords.lng * 100000) / 100000,
        });
      }
    } else {
      setFindCoordsCurr(null);
    }
  }, [selectionMode]);

  const { roundTripPolygon, rountdTripLayer } = useRoundTripPolygon(
    isRoundTrip,
    start,
    bearing,
    distance,
  );

  const mapBounds = useMemo(() => {
    const allPoints = [
      ...(start ? [[start.lon, start.lat] as [number, number]] : []),
      ...(finish ? [[finish.lon, finish.lat] as [number, number]] : []),
      ...(current ? [[current.lon, current.lat] as [number, number]] : []),
      ...(points || []).map(
        (p) => [p.coords.lon, p.coords.lat] as [number, number],
      ),
    ];
    if (!allPoints.length) {
      return null;
    }
    if (allPoints.length === 1) {
      const p = allPoints[0];
      allPoints.push([p[0] - 0.12, p[1] - 0.09]);
      allPoints.push([p[0] + 0.09, p[1] + 0.12]);
    }
    const pointsFeatures = turf.points(allPoints);
    const pointsBbox = turf.bbox(pointsFeatures);
    const coneBbox = roundTripPolygon ? turf.bbox(roundTripPolygon) : null;
    return combineBBox(pointsBbox, coneBbox);
  }, [start, finish, current, points, roundTripPolygon]);

  useEffect(() => {
    if (mapRef.current && mapBounds) {
      mapRef.current.fitBounds(mapBounds);
    }
  }, [mapBounds]);

  const regionLayers = useMemo(() => {
    return regions?.map((region) => {
      const layerId = `region-${region.region}`;
      const layerStyle: FillLayer = {
        id: layerId,
        type: "fill",
        source: layerId,
        paint: {
          "fill-color": stringToColor(region.region),
          "fill-opacity": 0.3,
        },
      };
      return (
        <Source
          key={region.region}
          id={layerId}
          type="geojson"
          data={region.geojson}
        >
          <Layer {...layerStyle} />
        </Source>
      );
    });
  }, [regions]);

  useEffect(() => {
    if (mapRef.current && mapBounds && regions?.length) {
      mapRef.current.setZoom(5);
    }
  }, [mapBounds, regions?.reduce((all, curr) => all + curr, "")]);

  return (
    <MapLibre
      ref={mapRef}
      mapLib={maplibre}
      initialViewState={
        mapBounds
          ? {
              bounds: mapBounds,
            }
          : {
              longitude: 24.853,
              latitude: 57.153,
              zoom: 4,
            }
      }
      mapStyle={getMapStyle(colorScheme)}
      onClick={(event) => {
        if (selectionMode === "tap") {
          setFindCoordsCurr({
            lat: Math.round(event.lngLat.lat * 100000) / 100000,
            lon: Math.round(event.lngLat.lng * 100000) / 100000,
            tapped: true,
          });
        }
      }}
      onMove={(event) => {
        if (selectionMode === "center") {
          setFindCoordsCurr({
            lat: Math.round(event.viewState.latitude * 100000) / 100000,
            lon: Math.round(event.viewState.longitude * 100000) / 100000,
          });
        }
      }}
    >
      {children}
      {(points || []).map((point) => (
        <MapMarker
          key={`${point.coords.lat},${point.coords.lon}`}
          lat={point.coords.lat}
          lon={point.coords.lon}
          title="Point"
          setStart={() => setStart(point.coords)}
          setFinish={isRoundTrip ? undefined : () => setFinish(point.coords)}
        >
          <CircleFadingPlusIcon className="size-8 text-blue-500" />
        </MapMarker>
      ))}
      {start && (
        <MapMarker
          lat={start.lat}
          lon={start.lon}
          title="Start"
          unset={() => setStart(null)}
        >
          <CirclePlayIcon className="size-8 text-green-500" />
        </MapMarker>
      )}
      {finish && (
        <MapMarker
          lat={finish.lat}
          lon={finish.lon}
          title="Finish"
          unset={() => setFinish(null)}
        >
          <CirclePauseIcon className="size-8 text-red-500" />
        </MapMarker>
      )}
      {current && (
        <MapMarker
          lat={current.lat}
          lon={current.lon}
          title="Finish"
          setStart={() => setStart(current)}
          setFinish={isRoundTrip ? undefined : () => setFinish(current)}
        >
          <CircleUserIcon className="size-8 text-teal-500" />
        </MapMarker>
      )}
      {findCoordsCurr && (
        <MapMarker
          key={`${findCoordsCurr.lat},${findCoordsCurr.lon}`}
          lat={findCoordsCurr.lat}
          lon={findCoordsCurr.lon}
          title="Point"
          setStart={() => {
            setStart(findCoordsCurr);
            setFindCoordsCurr(null);
          }}
          setFinish={
            isRoundTrip
              ? undefined
              : () => {
                  setFinish(findCoordsCurr);
                  setFindCoordsCurr(null);
                }
          }
          isDialogOpen={findCoordsCurr.tapped}
        >
          <CircleDotIcon className="size-8 text-yellow-500" />
        </MapMarker>
      )}
      {rountdTripLayer}
      {regionLayers}
      <NavigationControl position="top-left" />
    </MapLibre>
  );
}
