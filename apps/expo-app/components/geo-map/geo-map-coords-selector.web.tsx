import * as turf from "@turf/turf";
import {
  Map as MapLibre,
  type MapRef,
  type FillLayer,
  Source,
  Layer,
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

function createRoundTripPolygon(
  startPoint: [number, number],
  bearing: number,
  distance: number,
) {
  const start = turf.point(startPoint);
  const leftBearing = (bearing - 40 + 360) % 360;
  const rightBearing = (bearing + 40 + 360) % 360;
  const points = [];
  points.push(start.geometry.coordinates);
  const rightPoint = turf.destination(start, distance / 5, rightBearing, {
    units: "kilometers",
  });
  points.push(rightPoint.geometry.coordinates);
  const apexPoint = turf.destination(start, distance / 5, bearing, {
    units: "kilometers",
  });
  points.push(apexPoint.geometry.coordinates);
  const leftPoint = turf.destination(start, distance / 5, leftBearing, {
    units: "kilometers",
  });
  points.push(leftPoint.geometry.coordinates);
  points.push(start.geometry.coordinates);
  const polygon = turf.polygon([points]);

  return polygon;
}
export function GeoMapCoordsSelector({
  start,
  finish,
  current,
  points,
  findCoords,
  setStart,
  setFinish,
  isRoundTrip,
  bearing,
  distance,
}: GeoMapCoordsSelectorProps) {
  const mapRef = useRef<MapRef>(null);
  const [findCoordsCurr, setFindCoordsCurr] = useState<Coords | null>(null);

  useEffect(() => {
    if (findCoords) {
      const coords = mapRef.current?.getCenter();
      setFindCoordsCurr({
        lat: coords.lat,
        lon: coords.lng,
      });
    } else {
      setFindCoordsCurr(null);
    }
  }, [findCoords]);

  const roundTripPolygon = useMemo(() => {
    if (isRoundTrip && start) {
      return createRoundTripPolygon(
        [start.lon, start.lat],
        bearing || 0,
        distance || 0,
      );
    }
    return null;
  }, [isRoundTrip, start, distance, bearing]);

  const rountdTripLayer = useMemo(() => {
    if (roundTripPolygon) {
      const routeLayerId = "round-trip-layer";
      const layerStyle: FillLayer = {
        id: routeLayerId,
        type: "fill",
        source: routeLayerId,
        paint: {
          "fill-color": "#FF5937",
          "fill-opacity": 0.3,
        },
      };
      return (
        <Source id={routeLayerId} type="geojson" data={roundTripPolygon}>
          <Layer {...layerStyle} />
        </Source>
      );
    }
    return null;
  }, [roundTripPolygon]);

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
    const combinedBbox = coneBbox
      ? [
          Math.min(pointsBbox[0], coneBbox[0]), // minX
          Math.min(pointsBbox[1], coneBbox[1]), // minY
          Math.max(pointsBbox[2], coneBbox[2]), // maxX
          Math.max(pointsBbox[3], coneBbox[3]), // maxY
        ]
      : pointsBbox;
    return [
      combinedBbox[0] - Math.abs(combinedBbox[0] - combinedBbox[2]) / 10,
      combinedBbox[1] - Math.abs(combinedBbox[1] - combinedBbox[3]) / 10,
      combinedBbox[2] + Math.abs(combinedBbox[0] - combinedBbox[2]) / 10,
      combinedBbox[3] + Math.abs(combinedBbox[1] - combinedBbox[3]) / 10,
    ] as [number, number, number, number];
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
      {rountdTripLayer}
    </MapLibre>
  );
}
