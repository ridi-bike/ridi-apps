import { CirclePauseIcon, CirclePlayIcon, Trophy } from "lucide-react-native";
import { View, Text } from "react-native";

import { GeoMapStatic } from "~/components/geo-map/geo-map-static";

import { ScreenCard } from "./screen-card";

type RouteCardProps = {
  route: {
    id: number;
    distance: string;
    startCoords: [number, number];
    finishCoords: [number, number];
    roadTypes: {
      paved: number;
      gravel: number;
      trail: number;
    };
    score: number;
  };
};

export function RouteCard({ route }: RouteCardProps) {
  return (
    <ScreenCard
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
            <Text
              role="heading"
              aria-level={2}
              className="text-lg font-bold dark:text-gray-100"
            >
              {route.distance}
            </Text>
            <View className="flex flex-row items-center gap-2">
              <Trophy className="size-5 text-[#FF5937]" />
              <Text className="font-bold text-[#FF5937]">{route.score}</Text>
            </View>
          </View>
          <View className="pt-4">
            <Text
              role="heading"
              aria-level={3}
              className="mb-2 text-sm font-bold dark:text-gray-100"
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
        </>
      }
    />
  );
}
