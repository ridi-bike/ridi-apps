import { Image } from "expo-image";
import { CirclePause, CirclePlay, Navigation } from "lucide-react-native";
import { View, Text } from "react-native";

import { usePlan } from "~/lib/data-stores/plans";
import { useColorScheme } from "~/lib/useColorScheme";
import { cn } from "~/lib/utils";

import { GeoMapPlanView } from "./geo-map/geo-map-plan-view";
import { getCardinalDirection } from "./geo-map/util";
import { ScreenCard } from "./screen-card";

type RouteCardProps = {
  planId: string;
};

const blurhash =
  "|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj[";

export const PlanCard = ({ planId }: RouteCardProps) => {
  const plan = usePlan(planId);
  const { colorScheme } = useColorScheme();

  if (!plan) {
    return null;
  }

  const {
    startDesc,
    finishDesc,
    distance,
    bearing,
    startLat,
    startLon,
    finishLat,
    finishLon,
    tripType,
    state,
    mapPreviewDark,
    mapPreviewLight,
  } = plan;

  const mapImgUrl = colorScheme === "dark" ? mapPreviewDark : mapPreviewLight;

  return (
    <ScreenCard
      top={
        mapImgUrl ? (
          <Image
            style={{ width: "100%", height: "100%" }}
            source={mapImgUrl}
            placeholder={{ blurhash }}
            contentFit="cover"
            transition={1000}
          />
        ) : (
          <GeoMapPlanView
            start={{ lat: startLat, lon: startLon }}
            finish={
              finishLat && finishLon ? { lat: finishLat, lon: finishLon } : null
            }
            bearing={bearing}
            distance={distance}
          />
        )
      }
      middle={
        <>
          <View className="flex w-full flex-row items-start gap-3">
            <View>
              <CirclePlay className="mt-1 size-6 w-full text-[#FF5937]" />
            </View>
            <View className="flex-1">
              <Text
                role="heading"
                aria-level={2}
                className="text-sm font-bold text-[#FF5937]"
              >
                Start
              </Text>
              <Text className="truncate text-base font-medium dark:text-gray-200">
                {startDesc}
              </Text>
            </View>
          </View>
          {tripType === "round-trip" && (
            <View className="flex flex-row items-start gap-3">
              <Navigation className="mt-1 size-6 text-[#FF5937]" />
              <View>
                <Text
                  role="heading"
                  aria-level={2}
                  className="text-sm font-bold text-[#FF5937]"
                >
                  Direction
                </Text>
                <Text className="text-base font-medium dark:text-gray-200">
                  {getCardinalDirection(bearing || 0)} ({bearing || 0}°)
                </Text>
              </View>
            </View>
          )}
          {tripType === "start-finish" && (
            <View className="flex flex-row items-start gap-3">
              <View>
                <CirclePause className="mt-1 size-6 text-[#FF5937]" />
              </View>
              <View className="flex-1">
                <Text
                  role="heading"
                  aria-level={2}
                  className="text-sm font-bold text-[#FF5937]"
                >
                  Finish
                </Text>
                <Text className="truncate text-base font-medium dark:text-gray-200">
                  {finishDesc}
                </Text>
              </View>
            </View>
          )}
        </>
      }
      bottom={
        <View className="flex flex-row items-center justify-between">
          <View className="flex flex-col items-start justify-start">
            <Text className="font-bold dark:text-gray-100">
              {tripType === "start-finish"
                ? "Straigt line Distance"
                : "Target distance"}
            </Text>
            <Text className="font-medium dark:text-gray-200">
              {Math.round(distance / 1000)}km
            </Text>
          </View>
          <View className="flex flex-col items-end justify-center">
            <Text className="font-bold dark:text-gray-100">Status</Text>
            <Text
              className={cn("font-bold", {
                "text-gray-600": state === "new" || state === "planning",
                "text-green-500": state === "done",
                "text-red-500": state === "error",
              })}
            >
              {state}
            </Text>
          </View>
        </View>
      }
    />
  );
};
