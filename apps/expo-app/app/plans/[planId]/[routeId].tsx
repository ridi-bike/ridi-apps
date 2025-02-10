import { useLocalSearchParams } from "expo-router";
import { Trophy, Navigation } from "lucide-react-native";
import { useMemo } from "react";
import { View, Text } from "react-native";

import { GeoMapRouteView } from "~/components/geo-map/geo-map-route-view";
import { metersToDisplay } from "~/components/geo-map/util";
import { ScreenCard } from "~/components/screen-card";
import { ScreenFrame } from "~/components/screen-frame";
import { useStorePlans } from "~/lib/stores/plans-store";
import { useStoreRoute } from "~/lib/stores/routes-store";

export default function RouteDetails() {
  const { routeId, planId } = useLocalSearchParams();
  const { data: plans, error: planError, status: planStatus } = useStorePlans();
  const plan = plans.find((p) => p.id === planId);
  const planRoute = plan?.routes.find((r) => r.routeId === routeId);
  const {
    data: route,
    error,
    status,
  } = useStoreRoute(planRoute?.routeId || "");

  const breakdownSurface = useMemo(() => {
    if (!route) {
      return null;
    }
    return Object.values(route.data.stats.breakdown)
      .filter((bd) => bd.statType === "surface")
      .sort((a, b) => {
        return b.percentage - a.percentage;
      });
  }, [route]);

  const breakdownRoadType = useMemo(() => {
    if (!route) {
      return null;
    }
    return Object.values(route.data.stats.breakdown)
      .filter((bd) => bd.statType === "type")
      .sort((a, b) => {
        return b.percentage - a.percentage;
      });
  }, [route]);

  const routeOverview = useMemo(() => {
    return route
      ? route.data.latLonArray.map((c) => ({ lat: c[0], lon: c[1] }))
      : null;
  }, [route]);

  if (
    !plan ||
    !route ||
    !breakdownSurface ||
    !breakdownRoadType ||
    !routeOverview
  ) {
    return (
      <ScreenFrame title="Route details">
        <ScreenCard
          middle={
            <View>
              <Text>
                Route with id
                <Text className="px-2 text-gray-500">{routeId}</Text>
              </Text>
              is not found
            </View>
          }
        />
      </ScreenFrame>
    );
  }

  return (
    <ScreenFrame title="Route details">
      <View className="mx-2 max-w-5xl flex-1 gap-4">
        <ScreenCard
          topClassName="h-[65vh]"
          top={<GeoMapRouteView route={routeOverview} interactive={true} />}
          middle={
            <>
              <View className="flex flex-row items-center justify-between">
                <Text className="text-lg font-bold dark:text-gray-200">
                  {plan.startDesc}
                </Text>
                {!!plan.finishDesc && (
                  <Text className="text-lg font-bold dark:text-gray-200">
                    {plan.finishDesc}
                  </Text>
                )}
                <View className="flex flex-row items-center gap-2">
                  <Trophy className="size-5 text-[#FF5937]" />
                  <Text className="font-bold text-[#FF5937]">
                    {Math.round(route.data.stats.score)}
                  </Text>
                </View>
              </View>
            </>
          }
          bottom={
            <>
              <Navigation className="size-5 text-[#FF5937]" />
              <Text className="font-bold dark:text-gray-200">
                {metersToDisplay(route.data.stats.lenM)}
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
                Surface Type Breakdown
              </Text>
              <View className="flex flex-row gap-2 text-sm">
                <View className="flex-1">
                  {breakdownSurface[0] && (
                    <>
                      <View
                        className="mb-1 h-2 rounded-full bg-[#FF5937]"
                        style={{
                          width: `${Math.round(breakdownSurface[0].percentage)}%`,
                        }}
                      />
                      <Text className="dark:text-gray-200">
                        {breakdownSurface[0].statName}{" "}
                        {Math.round(breakdownSurface[0].percentage)}%
                      </Text>
                    </>
                  )}
                </View>
                <View className="flex-1">
                  {breakdownSurface[1] && (
                    <>
                      <View
                        className="mb-1 h-2 rounded-full bg-[#FFA37F]"
                        style={{
                          width: `${Math.round(breakdownSurface[1].percentage)}%`,
                        }}
                      />
                      <Text className="dark:text-gray-200">
                        {breakdownSurface[1].statName}{" "}
                        {Math.round(breakdownSurface[1].percentage)}%
                      </Text>
                    </>
                  )}
                </View>
                <View className="flex-1">
                  {breakdownSurface[2] && (
                    <>
                      <View
                        className="mb-1 h-2 rounded-full bg-[#FFD7C9]"
                        style={{
                          width: `${Math.round(breakdownSurface[2].percentage)}%`,
                        }}
                      />
                      <Text className="dark:text-gray-200">
                        {breakdownSurface[2].statName}{" "}
                        {Math.round(breakdownSurface[2].percentage)}%
                      </Text>
                    </>
                  )}
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
                Road Type Breakdown
              </Text>
              <View className="flex flex-row gap-2 text-sm">
                <View className="flex-1">
                  {breakdownRoadType[0] && (
                    <>
                      <View
                        className="mb-1 h-2 rounded-full bg-[#FF5937]"
                        style={{
                          width: `${Math.round(breakdownRoadType[0].percentage)}%`,
                        }}
                      />
                      <Text className="dark:text-gray-200">
                        {breakdownRoadType[0].statName}{" "}
                        {Math.round(breakdownRoadType[0].percentage)}%
                      </Text>
                    </>
                  )}
                </View>
                <View className="flex-1">
                  {breakdownRoadType[1] && (
                    <>
                      <View
                        className="mb-1 h-2 rounded-full bg-[#FFA37F]"
                        style={{
                          width: `${Math.round(breakdownRoadType[1].percentage)}%`,
                        }}
                      />
                      <Text className="dark:text-gray-200">
                        {breakdownRoadType[1].statName}{" "}
                        {Math.round(breakdownRoadType[1].percentage)}%
                      </Text>
                    </>
                  )}
                </View>
                <View className="flex-1">
                  {breakdownRoadType[2] && (
                    <>
                      <View
                        className="mb-1 h-2 rounded-full bg-[#FFD7C9]"
                        style={{
                          width: `${Math.round(breakdownRoadType[2].percentage)}%`,
                        }}
                      />
                      <Text className="dark:text-gray-200">
                        {breakdownRoadType[2].statName}{" "}
                        {Math.round(breakdownRoadType[2].percentage)}%
                      </Text>
                    </>
                  )}
                </View>
              </View>
            </View>
          }
        />
      </View>
    </ScreenFrame>
  );
}
