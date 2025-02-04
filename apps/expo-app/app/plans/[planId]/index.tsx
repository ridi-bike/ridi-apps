import { Link, useLocalSearchParams } from "expo-router";
import { MapPin, Navigation } from "lucide-react-native";
import { View, Text } from "react-native";

import { getCardinalDirection } from "~/components/geo-map/util";
import { RouteCard } from "~/components/route-card";
import { ScreenCard } from "~/components/screen-card";
import { ScreenFrame } from "~/components/screen-frame";
import { useStorePlans } from "~/lib/stores/plans-store";

export default function PlanDetails() {
  const { planId } = useLocalSearchParams();
  const { data: plans } = useStorePlans();
  const plan = plans.find((p) => p.id === planId);

  if (!plan) {
    return (
      <ScreenFrame title="Plan routes">
        <View className="mx-2 max-w-5xl flex-1">
          <ScreenCard
            middle={
              <View className="flex w-full flex-row items-center justify-center">
                <Text className="dark:text-gray-200">
                  Plan with id
                  <Text className=" px-2 text-gray-500">{planId}</Text> is not
                  found
                </Text>
              </View>
            }
          />
        </View>
      </ScreenFrame>
    );
  }

  return (
    <ScreenFrame title="Plan routes">
      <View className="mx-2 max-w-5xl flex-1">
        <ScreenCard
          middle={
            <>
              <View className="space-y-4">
                <View className="flex flex-row items-start gap-3">
                  <MapPin className="mt-1 size-6 text-[#FF5937]" />
                  <View>
                    <Text className="text-sm font-bold text-[#FF5937]">
                      Start
                    </Text>
                    <Text className="text-base font-medium dark:text-gray-200">
                      {plan.startDesc}
                    </Text>
                  </View>
                </View>
                {plan.tripType === "start-finish" && (
                  <View className="flex flex-row items-start gap-3">
                    <Navigation className="mt-1 size-6 text-[#FF5937]" />
                    <View>
                      <Text className="text-sm font-bold text-[#FF5937]">
                        Finish
                      </Text>
                      <Text className="text-base font-medium dark:text-gray-200">
                        {plan?.finishDesc}
                      </Text>
                    </View>
                  </View>
                )}
                {plan.tripType === "round-trip" && (
                  <View className="flex flex-row items-start gap-3">
                    <Navigation className="mt-1 size-6 text-[#FF5937]" />
                    <View>
                      <Text className="text-sm font-bold text-[#FF5937]">
                        Direction
                      </Text>
                      <Text className="text-base font-medium dark:text-gray-200">
                        {getCardinalDirection(plan.bearing!)} ({plan.bearing}
                        °)
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </>
          }
          bottom={
            <>
              <Text className="font-bold dark:text-gray-100">
                {plan.tripType === "round-trip"
                  ? "Target distance"
                  : "Straigt line distance"}
              </Text>
              <Text className="font-medium dark:text-gray-200">
                {plan.distance / 1000}km
              </Text>
            </>
          }
        />
        <Text
          role="heading"
          aria-level={2}
          className="my-6 text-2xl font-bold dark:text-gray-100"
        >
          Available Routes
        </Text>
        <View className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {plan.routes.map((route) => (
            <Link
              key={route.routeId}
              href={`/plans/${plan.id}/${route.routeId}`}
            >
              <RouteCard route={route} />
            </Link>
          ))}
        </View>
      </View>
    </ScreenFrame>
  );
}
