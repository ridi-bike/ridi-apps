import { Image } from "expo-image";
import { Trophy } from "lucide-react-native";
import { AnimatePresence, MotiView } from "moti";
import { View, Text } from "react-native";

import {
  useRoute,
  useRouteCoords,
  useRouteRoadStats,
} from "~/lib/data-stores/routes";
import { useColorScheme } from "~/lib/useColorScheme";

import { GeoMapRouteView } from "./geo-map/geo-map-route-view";
import { metersToDisplay } from "./geo-map/util";
import { ScreenCard } from "./screen-card";

type RouteCardProps = {
  routeId: string;
};
const blurhash =
  "|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj[";

export function RouteCard({ routeId }: RouteCardProps) {
  const route = useRoute(routeId);
  const routeStats = useRouteRoadStats(routeId, "surface");

  const { colorScheme } = useColorScheme();
  const mapImgUrl =
    colorScheme === "dark" ? route?.mapPreviewDark : route?.mapPreviewLight;

  const routeOverview = useRouteCoords(routeId, true);

  return (
    <ScreenCard
      top={
        <AnimatePresence>
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
                {metersToDisplay(route.lenM)}
              </Text>
              <View className="flex flex-row items-center gap-2">
                <Trophy className="size-5 text-[#FF5937]" />
                <Text className="font-bold text-[#FF5937]">
                  {Math.round(route.score)}
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
                {!!routeStats && (
                  <>
                    {Array(3).map((_, idx) => (
                      <View key={idx} className="flex-1">
                        {!!routeStats[idx] && (
                          <>
                            <View
                              className="mb-1 h-2 rounded-full bg-[#FF5937]"
                              style={{
                                width: `${Math.round(routeStats[idx].percentage)}%`,
                              }}
                            />
                            <Text className="dark:text-gray-200">
                              {routeStats[idx].statName}{" "}
                              {Math.round(routeStats[idx].percentage)}%
                            </Text>
                          </>
                        )}
                      </View>
                    ))}
                  </>
                )}
              </View>
            </MotiView>
          )}
        </AnimatePresence>
      }
    />
  );
}
