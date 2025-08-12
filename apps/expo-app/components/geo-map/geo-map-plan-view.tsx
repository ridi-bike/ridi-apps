import { type GeoMapPlanViewProps } from "@ridi/geo-maps";
import { GeoMapPlanView as LibMap } from "@ridi/geo-maps";
import { CirclePause, CirclePlay } from "lucide-react-native";
import { View } from "react-native";

import { useColorScheme } from "~/lib/useColorScheme";
import { cn } from "~/lib/utils";

export function GeoMapPlanView(
  props: Omit<GeoMapPlanViewProps, "colorScheme"> & { className?: string },
) {
  const { colorScheme } = useColorScheme();
  return (
    <View className={cn("size-full", props.className)}>
      <LibMap
        {...props}
        start={
          props.start
            ? {
                ...props.start,
                icon: <CirclePlay className="size-8 text-green-500" />,
              }
            : undefined
        }
        finish={
          props.finish
            ? {
                ...props.finish,
                icon: <CirclePause className="size-8 text-red-500" />,
              }
            : undefined
        }
        colorScheme={colorScheme}
      />
    </View>
  );
}
