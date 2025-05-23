import { Image } from "expo-image";
import { Trophy } from "lucide-react-native";
import { AnimatePresence, MotiView } from "moti";
import { useMemo } from "react";
import { View, Text } from "react-native";

import { type Plan } from "~/lib/stores/plans-store";
import { useStoreRoute } from "~/lib/stores/routes-store";
import { useColorScheme } from "~/lib/useColorScheme";

import { ErrorBox } from "./error";
import { GeoMapRouteView } from "./geo-map/geo-map-route-view";
import { metersToDisplay } from "./geo-map/util";
import { ScreenCard } from "./screen-card";

type RouteCardProps = {
  routeShort: Plan["routes"][number];
};
const blurhash =
  "|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj[";

export function RouteCard({ routeShort }: RouteCardProps) {
  const {
    data: route,
    error,
    status,
    refetch,
  } = useStoreRoute(routeShort.routeId);

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

  const { colorScheme } = useColorScheme();
  const mapImgUrl =
    colorScheme === "dark"
      ? routeShort.routeMapPreviewDark
      : routeShort.routeMapPreviewLight;

  const routeOverview = useMemo(() => {
    return !mapImgUrl && route
      ? route.data.latLonArray
          .filter(
            (_c, i) => i % Math.ceil(route.data.latLonArray.length / 25) === 0,
          )
          .map((c) => ({ lat: c[0], lon: c[1] }))
      : null;
  }, [mapImgUrl, route]);

  return (
    <ScreenCard
      top={
        <AnimatePresence>
          {!!error && status !== "pending" && (
            <ErrorBox key="error" error={error} retry={refetch} />
          )}
          {mapImgUrl ? (
            <Image
              style={{ width: "100%", height: "100%" }}
              source={mapImgUrl}
              placeholder={{ blurhash }}
              contentFit="cover"
              transition={1000}
            />
          ) : (
            <>
              {!!routeOverview && (
                <MotiView
                  key="map"
                  className="size-full"
                  from={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <GeoMapRouteView route={routeOverview} interactive={false} />
                </MotiView>
              )}
            </>
          )}
        </AnimatePresence>
      }
      middle={
        <AnimatePresence>
          {!route && <View key="placeholder" className="min-h-[108px]" />}
          {!!route && (
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex min-h-7 flex-row items-center justify-between"
              key="top"
            >
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
            </MotiView>
          )}
          {!!route && (
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="min-h-20 pt-4"
              key="bottom"
            >
              <Text
                role="heading"
                aria-level={3}
                className="mb-2 text-sm font-bold dark:text-gray-100"
              >
                <AnimatePresence>
                  {!!route && <>Road Type Breakdown</>}
                </AnimatePresence>
              </Text>
              <View className="flex flex-row gap-2 text-sm">
                {!!breakdown && (
                  <View className="flex-1">
                    {!!breakdown[0] && (
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
                )}
                {!!breakdown && (
                  <View className="flex-1">
                    {!!breakdown[1] && (
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
                )}
                {!!breakdown && (
                  <View className="flex-1">
                    {!!breakdown[2] && (
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
                )}
              </View>
            </MotiView>
          )}
        </AnimatePresence>
      }
    />
  );
}
