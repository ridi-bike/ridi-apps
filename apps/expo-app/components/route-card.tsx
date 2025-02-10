import { CirclePauseIcon, CirclePlayIcon, Trophy } from "lucide-react-native";
import { useMemo } from "react";
import { View, Text } from "react-native";

import { type Plan } from "~/lib/stores/plans-store";
import { useStoreRoute } from "~/lib/stores/routes-store";

import { GeoMapRouteView } from "./geo-map/geo-map-route-view";
import { metersToDisplay } from "./geo-map/util";
import { ScreenCard } from "./screen-card";

type RouteCardProps = {
  plan: Plan;
  routeId: string;
};

export function RouteCard({ routeId, plan }: RouteCardProps) {
  const { data: route, error, status } = useStoreRoute(routeId);

  const breakdown = useMemo(() => {
    if (!route) {
      return null;
    }
    return Object.values(route.data.stats.breakdown)
      .filter((bd) => bd.statType === "surface")
      .sort((a, b) => {
        return b.percentage - a.percentage;
      });
  }, [route]);

  const routeOverview = useMemo(() => {
    return route
      ? route.data.latLonArray
          .filter(
            (_c, i) => i % Math.ceil(route.data.latLonArray.length / 25) === 0,
          )
          .map((c) => ({ lat: c[0], lon: c[1] }))
      : null;
  }, [route]);

  if (!route || !breakdown || !routeOverview) {
    return (
      <ScreenCard
        middle={
          <View>
            <Text>
              Route with id<Text className="px-2 text-gray-500">{routeId}</Text>
            </Text>
            is not found
          </View>
        }
      />
    );
  }

  return (
    <ScreenCard
      top={<GeoMapRouteView route={routeOverview} interactive={false} />}
      middle={
        <>
          <View className="flex flex-row items-center justify-between">
            <Text
              role="heading"
              aria-level={2}
              className="text-lg font-bold dark:text-gray-100"
            >
              {metersToDisplay(route.data.stats.lenM)}
            </Text>
            <View className="flex flex-row items-center gap-2">
              <Trophy className="size-5 text-[#FF5937]" />
              <Text className="font-bold text-[#FF5937]">
                {Math.round(route.data.stats.score)}
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
                {breakdown[0] && (
                  <>
                    <View
                      className="mb-1 h-2 rounded-full bg-[#FF5937]"
                      style={{
                        width: `${Math.round(breakdown[0].percentage)}%`,
                      }}
                    />
                    <Text className="dark:text-gray-200">
                      {breakdown[0].statName}{" "}
                      {Math.round(breakdown[0].percentage)}%
                    </Text>
                  </>
                )}
              </View>
              <View className="flex-1">
                {breakdown[1] && (
                  <>
                    <View
                      className="mb-1 h-2 rounded-full bg-[#FFA37F]"
                      style={{
                        width: `${Math.round(breakdown[1].percentage)}%`,
                      }}
                    />
                    <Text className="dark:text-gray-200">
                      {breakdown[1].statName}{" "}
                      {Math.round(breakdown[1].percentage)}%
                    </Text>
                  </>
                )}
              </View>
              <View className="flex-1">
                {breakdown[2] && (
                  <>
                    <View
                      className="mb-1 h-2 rounded-full bg-[#FFD7C9]"
                      style={{
                        width: `${Math.round(breakdown[2].percentage)}%`,
                      }}
                    />
                    <Text className="dark:text-gray-200">
                      {breakdown[2].statName}{" "}
                      {Math.round(breakdown[2].percentage)}%
                    </Text>
                  </>
                )}
              </View>
            </View>
          </View>
        </>
      }
    />
  );
}
