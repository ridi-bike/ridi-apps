import "maplibre-gl/dist/maplibre-gl.css";
import { GeoMapRouteView as LibMap } from "@ridi/geo-maps";
import { type GeoMapRouteViewProps } from "@ridi/geo-maps";
import { View } from "react-native";

import { useColorScheme } from "~/lib/useColorScheme";
import { cn } from "~/lib/utils";

export function GeoMapRouteView(
  props: Omit<GeoMapRouteViewProps, "colorScheme"> & { className?: string },
) {
  const { colorScheme } = useColorScheme();
  return (
    <View className={cn("size-full", props.className)}>
      <LibMap {...props} colorScheme={colorScheme} />
    </View>
  );
}
