import * as turf from '@turf/turf'
import {
  Map as MapLibre,
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from '~/components/button';
import { MapMarker } from "~/components/geo-map/marker";
import { type Coords, type GeoMapCoordsSelectorProps } from "~/components/geo-map/types";

export function GeoMapCoordsSelector({
  start,
  finish,
  current,
  points,
  findCoords,
  setStart,
  setFinish,
  isRoundTrip
}: GeoMapCoordsSelectorProps) {
  const mapRef = useRef<MapRef>(null);
  const [findCoordsCurr, setFindCoordsCurr] = useState<Coords | null>(
    null,
  );

  useEffect(() => {
    if (findCoords) {
      const coords = mapRef.current?.getCenter()
      setFindCoordsCurr({
        lat: coords.lat,
        lon: coords.lng,
      });
    } else {
      setFindCoordsCurr(null)
    }
  }, [findCoords]);

  const mapBounds = useMemo(() => {
    const allPoints = [
      ...(start ? [[start.lon, start.lat]] : []),
      ...(finish ? [[finish.lon, finish.lat]] : []),
      ...(current ? [[current.lon, current.lat]] : []),
      ...(points || []).map(p => [p.coords.lon, p.coords.lat]),
    ]
    if (!allPoints.length) {
      return null
    }
    const features = turf.points(
      allPoints
    );
    const mapBounds = turf.bbox(features);
    return [
      mapBounds[0] - 0.001,
      mapBounds[1] - 0.001,
      mapBounds[2] + 0.001,
      mapBounds[3] + 0.001
    ] as [number, number, number, number]
  }, [finish, points, start, current]);


  useEffect(() => {
    if (mapRef.current && mapBounds) {
      mapRef.current.fitBounds(
        mapBounds
      );
    }
  }, [mapBounds]);

  return (
    <MapLibre
      ref={mapRef}
      mapLib={maplibre}
      initialViewState={
        mapBounds
          ? {
            bounds:
              mapBounds,
          }
          : {
            longitude: 24.853,
            latitude: 57.153,
            zoom: 4,
          }
      }
      mapStyle="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json"
      onMove={(event) => {
        if (findCoords) {
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
          title={point.title}
          description={point.description}
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
          title="From"
          description={`${start.lat}, ${start.lon}`}
          unset={() => setStart(null)}
        >
          <CirclePlayIcon className="size-8 text-green-500" />
        </MapMarker>
      )}
      {finish && (
        <MapMarker
          lat={finish.lat}
          lon={finish.lon}
          title="To"
          description={`${finish.lat}, ${finish.lon}`}
          unset={() => setFinish(null)}
        >
          <CirclePauseIcon className="size-8 text-red-500" />
        </MapMarker>
      )}
      {current && (
        <MapMarker
          lat={current.lat}
          lon={current.lon}
          title="To"
          description={`${current.lat}, ${current.lon}`}
          setStart={() => setStart(current)}
          setFinish={isRoundTrip ? undefined : () => setFinish(current)}
        >
          <CircleUserIcon className="size-8 text-teal-500" />
        </MapMarker>
      )}
      {findCoordsCurr && (
        <MapMarker
          lat={findCoordsCurr.lat}
          lon={findCoordsCurr.lon}
          title="To"
          description={`${findCoordsCurr.lat}, ${findCoordsCurr.lon}`}
          setStart={() => setStart(findCoordsCurr)}
          setFinish={isRoundTrip ? undefined : () => setFinish(findCoordsCurr)}
        >
          <CircleDotIcon className="size-8 text-yellow-500" />
        </MapMarker>
      )}
    </MapLibre>
  );
}
