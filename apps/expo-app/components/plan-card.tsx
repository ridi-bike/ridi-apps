import {
  CirclePauseIcon,
  CirclePlayIcon,
  MapPin,
  Navigation,
} from "lucide-react-native";
import { View, Text } from "react-native";

import { GeoMapStatic } from "./geo-map/geo-map-static";
import { ScreenCard } from "./screen-card";

type RouteCardProps = {
  startAddress: string;
  endAddress: string;
  distance: string;
  startCoords: [number, number];
  finishCoords: [number, number];
};

export const PlanCard = ({
  startAddress,
  endAddress,
  distance,
  startCoords,
  finishCoords,
}: RouteCardProps) => {
  return (
    <ScreenCard
      top={
        <GeoMapStatic
          points={[
            {
              icon: <CirclePlayIcon className="size-8 text-green-500" />,
              coords: startCoords,
            },
            {
              icon: <CirclePauseIcon className="size-8 text-red-500" />,
              coords: finishCoords,
            },
          ]}
        />
      }
      middle={
        <>
          <View className="flex flex-row items-start gap-3">
            <MapPin className="mt-1 size-6 text-[#FF5937]" />
            <View>
              <Text
                role="heading"
                aria-level={2}
                className="text-sm font-bold text-[#FF5937]"
              >
                Start
              </Text>
              <Text className="text-base font-medium dark:text-gray-200">
                {startAddress}
              </Text>
            </View>
          </View>
          <View className="flex flex-row items-start gap-3">
            <Navigation className="mt-1 size-6 text-[#FF5937]" />
            <View>
              <Text
                role="heading"
                aria-level={2}
                className="text-sm font-bold text-[#FF5937]"
              >
                End
              </Text>
              <Text className="text-base font-medium dark:text-gray-200">
                {endAddress}
              </Text>
            </View>
          </View>
        </>
      }
      bottom={
        <>
          <Text className="font-bold dark:text-gray-100">
            Straigt line distance:{" "}
          </Text>
          <Text className="font-medium dark:text-gray-200">{distance}</Text>
        </>
      }
    />
  );
};
