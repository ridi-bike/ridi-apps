import * as turf from "@turf/turf";
import { Map as MapLibre } from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibre from "maplibre-gl";
import { useMemo } from "react";
import { View } from "react-native";

import { cn } from "~/lib/utils";

import GeoMapMarker from "./geo-map-marker";
import { getMapStyle } from "./style";
import { type Coords } from "./types";

type GeoMapStaticProps = {
  points: { icon: React.ReactNode; coords: Coords }[];
  className?: string;
};

export function GeoMapStatic(props: GeoMapStaticProps) {
  const bbox = useMemo(() => {
    const features = turf.points(
      props.points.map((p) => [p.coords.lon, p.coords.lat]),
    );
    return turf.bbox(features);
  }, [props.points]);

  return (
    <View className={cn("size-full", props.className)}>
      <MapLibre
        mapLib={maplibre}
        initialViewState={{
          bounds: [
            bbox[0] - 0.03,
            bbox[1] - 0.03,
            bbox[2] + 0.03,
            bbox[3] + 0.03,
          ],
        }}
        mapStyle={getMapStyle("light")}
        interactive={false}
        attributionControl={false}
      >
        {props.points.map((point) => (
          <GeoMapMarker
            key={`${point.coords.lat}-${point.coords.lon}`}
            lat={point.coords.lat}
            lon={point.coords.lon}
          >
            {point.icon}
          </GeoMapMarker>
        ))}
      </MapLibre>
    </View>
  );
}
