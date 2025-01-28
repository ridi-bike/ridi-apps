import {
  CirclePauseIcon,
  CirclePlayIcon,
  MapPin,
  Navigation,
} from "lucide-react-native";
import { View, Text, ScrollView } from "react-native";

import { GeoMapStatic } from "./geo-map/geo-map-static";

type RouteCardProps = {
  startAddress: string;
  endAddress: string;
  distance: string;
  startCoords: [number, number];
  finishCoords: [number, number];
}

export const RouteCard = ({
  startAddress,
  endAddress,
  distance,
  startCoords,
  finishCoords,
}: RouteCardProps) => {
  return (
    <ScrollView className="size-full">
      <View
        role="article"
        className="w-full rounded-2xl border-2 border-black bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800"
      >
        <View className="mb-6 h-[240px] overflow-hidden rounded-xl border-2 border-black dark:border-gray-700">
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
        </View>
        <View className="space-y-4">
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
          <View className="flex flex-row border-t-2 border-black pt-4 text-base dark:border-gray-700">
            <Text className="font-bold dark:text-gray-100">
              Straigt line distance:{" "}
            </Text>
            <Text className="font-medium dark:text-gray-200">{distance}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};
