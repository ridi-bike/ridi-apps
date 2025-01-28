import {
  Trophy,
  Navigation,
  CirclePlayIcon,
  CirclePauseIcon,
} from "lucide-react-native";
import { View, Text } from "react-native";

import { GeoMapStatic } from "~/components/geo-map/geo-map-static";
import { ScreenCard } from "~/components/screen-card";
import { ScreenFrame } from "~/components/screen-frame";

const route = {
  name: "Downtown Loop",
  distance: "3.2 miles",
  startCoords: [37.7749, -122.4194] as [number, number],
  finishCoords: [37.7937, -122.3965] as [number, number],
  roadTypes: {
    paved: 70,
    gravel: 20,
    trail: 10,
  },
  surfaceTypes: {
    smooth: 65,
    moderate: 25,
    rough: 10,
  },
  score: 85,
};
export default function RouteDetails() {
  return (
    <ScreenFrame title="Route details">
      <View className="mx-2 max-w-3xl flex-1 gap-4">
        <ScreenCard
          topClassName="h-[65vh]"
          top={
            <GeoMapStatic
              points={[
                {
                  icon: <CirclePlayIcon className="size-8 text-green-500" />,
                  coords: route.startCoords,
                },
                {
                  icon: <CirclePauseIcon className="size-8 text-red-500" />,
                  coords: route.finishCoords,
                },
              ]}
            />
          }
          middle={
            <>
              <View className="flex flex-row items-center justify-between">
                <Text className="text-lg font-bold dark:text-gray-200">
                  {route.name}
                </Text>
                <View className="flex flex-row items-center gap-2">
                  <Trophy className="size-5 text-[#FF5937]" />
                  <Text className="font-bold text-[#FF5937]">
                    {route.score}
                  </Text>
                </View>
              </View>
            </>
          }
          bottom={
            <>
              <Navigation className="size-5 text-[#FF5937]" />
              <Text className="font-bold dark:text-gray-200">
                {route.distance}
              </Text>
            </>
          }
        />
        <ScreenCard
          middle={
            <View>
              <Text
                role="heading"
                aria-level={2}
                className="mb-4 text-lg font-bold dark:text-gray-200"
              >
                Road Type Breakdown
              </Text>
              <View className="flex flex-row gap-2 text-sm">
                <View className="flex-1">
                  <View
                    className="mb-1 h-2 rounded-full bg-[#FF5937]"
                    style={{
                      width: `${route.roadTypes.paved}%`,
                    }}
                  />
                  <Text className="dark:text-gray-200">
                    Paved {route.roadTypes.paved}%
                  </Text>
                </View>
                <View className="flex-1">
                  <View
                    className="mb-1 h-2 rounded-full bg-[#FFA37F]"
                    style={{
                      width: `${route.roadTypes.gravel}%`,
                    }}
                  />
                  <Text className="dark:text-gray-200">
                    Gravel {route.roadTypes.gravel}%
                  </Text>
                </View>
                <View className="flex-1">
                  <View
                    className="mb-1 h-2 rounded-full bg-[#FFD7C9]"
                    style={{
                      width: `${route.roadTypes.trail}%`,
                    }}
                  />
                  <Text className="dark:text-gray-200">
                    Trail {route.roadTypes.trail}%
                  </Text>
                </View>
              </View>
            </View>
          }
          bottom={
            <View>
              <Text
                role="heading"
                aria-level={2}
                className="mb-4 text-lg font-bold dark:text-gray-200"
              >
                Surface Type Breakdown
              </Text>
              <View className="flex flex-row gap-2 text-sm">
                <View className="flex-1">
                  <View
                    className="mb-1 h-2 rounded-full bg-[#FF5937]"
                    style={{
                      width: `${route.surfaceTypes.smooth}%`,
                    }}
                  />
                  <Text className="dark:text-gray-200">
                    Smooth {route.surfaceTypes.smooth}%
                  </Text>
                </View>
                <View className="flex-1">
                  <View
                    className="mb-1 h-2 rounded-full bg-[#FFA37F]"
                    style={{
                      width: `${route.surfaceTypes.moderate}%`,
                    }}
                  />
                  <Text className="dark:text-gray-200">
                    Moderate {route.surfaceTypes.moderate}%
                  </Text>
                </View>
                <View className="flex-1">
                  <View
                    className="mb-1 h-2 rounded-full bg-[#FFD7C9]"
                    style={{
                      width: `${route.surfaceTypes.rough}%`,
                    }}
                  />
                  <Text className="dark:text-gray-200">
                    Rough {route.surfaceTypes.rough}%
                  </Text>
                </View>
              </View>
            </View>
          }
        />
      </View>
    </ScreenFrame>
  );
}
