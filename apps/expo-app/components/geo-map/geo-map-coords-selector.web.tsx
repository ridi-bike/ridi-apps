import * as turf from "@turf/turf";
import {
  Map as MapLibre,
  NavigationControl,
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

import { combineBBox, useRoundTripPolygon } from "./util";

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
}: GeoMapCoordsSelectorProps) {
  const mapRef = useRef<MapRef>(null);
  const [findCoordsCurr, setFindCoordsCurr] = useState<
    (Coords & { tapped?: boolean }) | null
  >(null);

  useEffect(() => {
    if (selectionMode === "center") {
      const coords = mapRef.current?.getCenter();
      if (coords) {
        setFindCoordsCurr({
          lat: coords.lat,
          lon: coords.lng,
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
      ...(start ? [[start.lon, start.lat]] : []),
      ...(finish ? [[finish.lon, finish.lat]] : []),
      ...(current ? [[current.lon, current.lat]] : []),
      ...(points || []).map((p) => [p.coords.lon, p.coords.lat]),
    ];
    if (!allPoints.length) {
      return null;
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
      mapStyle="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
      onClick={(event) => {
        if (selectionMode === "tap") {
          setFindCoordsCurr({
            lat: event.lngLat.lat,
            lon: event.lngLat.lng,
            tapped: true,
          });
        }
      }}
      onMove={(event) => {
        if (selectionMode === "center") {
          setFindCoordsCurr({
            lat: event.viewState.latitude,
            lon: event.viewState.longitude,
          });
        }
      }}
    >
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
          setStart={() => setStart(findCoordsCurr)}
          setFinish={isRoundTrip ? undefined : () => setFinish(findCoordsCurr)}
          isDialogOpen={findCoordsCurr.tapped}
        >
          <CircleDotIcon className="size-8 text-yellow-500" />
        </MapMarker>
      )}
      {rountdTripLayer}
      <NavigationControl position="bottom-right" />
    </MapLibre>
  );
}
