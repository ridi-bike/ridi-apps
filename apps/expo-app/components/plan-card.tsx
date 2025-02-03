import { MapPin, Navigation } from "lucide-react-native";
import { View, Text } from "react-native";

import { GeoMapPlanView } from "./geo-map/geo-map-plan-view";
import { type Coords } from "./geo-map/types";
import { getCardinalDirection } from "./geo-map/util";
import { ScreenCard } from "./screen-card";

type RouteCardProps = {
  startDesc: string;
  finishDesc: string | null;
  distance: number;
  bearing: number | null;
  startCoords: Coords;
  finishCoords: Coords | null;
  tripType: "round-trip" | "start-finish";
};

export const PlanCard = ({
  startDesc,
  finishDesc,
  distance,
  bearing,
  startCoords,
  finishCoords,
  tripType,
}: RouteCardProps) => {
  return (
    <ScreenCard
      top={
        <GeoMapPlanView
          start={startCoords}
          finish={finishCoords}
          bearing={bearing}
          distance={distance}
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
                  {getCardinalDirection(bearing || 0)} (${bearing || 0}°)
                </Text>
              </View>
            </View>
          )}
          {tripType === "start-finish" && (
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
                  {finishDesc}
                </Text>
              </View>
            </View>
          )}
        </>
      }
      bottom={
        <>
          <Text className="font-bold dark:text-gray-100">
            {tripType === "start-finish"
              ? "Distance between start and finish"
              : "Desired distance"}
          </Text>
          <Text className="font-medium dark:text-gray-200">
            {Math.round(distance / 1000)}km
          </Text>
        </>
      }
    />
  );
};
