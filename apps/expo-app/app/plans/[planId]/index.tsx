import { Link, useLocalSearchParams } from "expo-router";
import { MapPin, Navigation } from "lucide-react-native";
import { AnimatePresence, MotiView } from "moti";
import { View, Text } from "react-native";

import { ErrorBox } from "~/components/error";
import {
  getCardinalDirection,
  metersToDisplay,
} from "~/components/geo-map/util";
import { Loading } from "~/components/loading";
import { RouteCard } from "~/components/route-card";
import { ScreenCard } from "~/components/screen-card";
import { ScreenFrame } from "~/components/screen-frame";
import { MotiText } from "~/lib/nativewind";
import { useStorePlans } from "~/lib/stores/plans-store";
import { cn } from "~/lib/utils";

export default function PlanDetails() {
  const { planId } = useLocalSearchParams();
  const { data: plans, error, status, refetch } = useStorePlans();
  const plan = plans?.find((p) => p.id === planId);

  return (
    <ScreenFrame title="Plan routes">
      <AnimatePresence>
        {!plans && !error && <Loading className="size-12 text-[#ff4a25]" />}
        {!!error && status !== "pending" && (
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mx-2 max-w-5xl flex-1"
          >
            <ErrorBox error={error} retry={refetch} />
          </MotiView>
        )}
        {plan && (
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mx-2 max-w-5xl flex-1"
          >
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
                            {getCardinalDirection(plan.bearing!)} (
                            {plan.bearing}°)
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </>
              }
              bottom={
                <View className="flex flex-row items-center justify-between">
                  <View className="flex flex-col items-start justify-start">
                    <Text className="font-bold dark:text-gray-100">
                      {plan.tripType === "round-trip"
                        ? "Target distance"
                        : "Straigt line distance"}
                    </Text>
                    <Text className="font-medium dark:text-gray-200">
                      {metersToDisplay(plan.distance)}
                    </Text>
                  </View>
                  <View className="flex flex-col items-end justify-center">
                    <Text className="font-bold dark:text-gray-100">Status</Text>
                    <Text
                      className={cn("font-bold", {
                        "text-gray-600":
                          plan.state === "new" || plan.state === "planning",
                        "text-green-500": plan.state === "done",
                        "text-red-500": plan.state === "error",
                      })}
                    >
                      {plan.state}
                    </Text>
                  </View>
                </View>
              }
            />
            {plan.state === "done" && plan.routes.length === 0 && (
              <MotiText
                className="m-8 text-lg dark:text-gray-200"
                from={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                No routes found, please check rules
              </MotiText>
            )}
            {plan.state === "done" && plan.routes.length > 0 && (
              <>
                <Text
                  role="heading"
                  aria-level={2}
                  className="my-6 text-2xl font-bold dark:text-gray-100"
                >
                  Available Routes
                </Text>
                <View className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {plan.routes.map((route) => (
                    <Link
                      key={route.routeId}
                      href={`/plans/${plan.id}/${route.routeId}`}
                    >
                      <RouteCard routeId={route.routeId} plan={plan} />
                    </Link>
                  ))}
                </View>
              </>
            )}
          </MotiView>
        )}
      </AnimatePresence>
    </ScreenFrame>
  );
}
