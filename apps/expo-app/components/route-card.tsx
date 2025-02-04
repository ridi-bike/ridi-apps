import { CirclePauseIcon, CirclePlayIcon, Trophy } from "lucide-react-native";
import { View, Text } from "react-native";

import { type Plan } from "~/lib/stores/plans-store";
import { useStoreRoute } from "~/lib/stores/routes-store";

import { GeoMapStatic } from "./geo-map/geo-map-static";
import { ScreenCard } from "./screen-card";

type RouteCardProps = {
  plan: Plan;
  routeId: string;
};

export function RouteCard({ routeId, plan }: RouteCardProps) {
  const { data: route, error, status } = useStoreRoute(routeId);

  if (!route) {
    return (
      <ScreenCard
        middle={
          <View>
            <Text>
              Route with id<Text className="px-2 text-gray-500">{route}</Text>
            </Text>
            is not found
          </View>
        }
      />
    );
  }

  return (
    <ScreenCard
      top={
        <GeoMapStatic
          points={[
            {
              icon: <CirclePlayIcon className="size-8 text-green-500" />,
              coords: {
                lat: plan.startLat,
                lon: plan.startLon,
              },
            },
            {
              icon: <CirclePauseIcon className="size-8 text-red-500" />,
              coords: {
                lat: plan.finishLat,
                lon: plan.finishLon,
              },
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
              {route.data.stats.lenM / 1000}km
            </Text>
            <View className="flex flex-row items-center gap-2">
              <Trophy className="size-5 text-[#FF5937]" />
              <Text className="font-bold text-[#FF5937]">
                {route.data.stats.score}
              </Text>
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
                    width: `${route.data.stats.breakdown[0].percentage}%`,
                  }}
                />
                <Text className="dark:text-gray-200">
                  {route.data.stats.breakdown[0].statName}{" "}
                  {route.data.stats.breakdown[0].percentage}%
                </Text>
              </View>
              <View className="flex-1">
                <View
                  className="mb-1 h-2 rounded-full bg-[#FFA37F]"
                  style={{
                    width: `${route.data.stats.breakdown[1].percentage}%`,
                  }}
                />
                <Text className="dark:text-gray-200">
                  {route.data.stats.breakdown[1].statName}{" "}
                  {route.data.stats.breakdown[1].percentage}%
                </Text>
              </View>
              <View className="flex-1">
                <View
                  className="mb-1 h-2 rounded-full bg-[#FFD7C9]"
                  style={{
                    width: `${route.data.stats.breakdown[2].percentage}%`,
                  }}
                />
                <Text className="dark:text-gray-200">
                  {route.data.stats.breakdown[2].statName}{" "}
                  {route.data.stats.breakdown[2].percentage}%
                </Text>
              </View>
            </View>
          </View>
        </>
      }
    />
  );
}
