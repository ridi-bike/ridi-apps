import { Link, useLocalSearchParams } from "expo-router";
import {
  Bell,
  Bug,
  Compass,
  Map,
  MapPin,
  Navigation,
} from "lucide-react-native";
import { AnimatePresence, MotiView } from "moti";
import { useEffect, useState } from "react";
import { View, Text, ScrollView } from "react-native";

import { ErrorBox } from "~/components/error";
import {
  getCardinalDirection,
  metersToDisplay,
} from "~/components/geo-map/util";
import { Loading } from "~/components/loading";
import { RouteCard } from "~/components/route-card";
import { ScreenCard } from "~/components/screen-card";
import { ScreenFrame } from "~/components/screen-frame";
import { useStorePlans } from "~/lib/stores/plans-store";
import { cn } from "~/lib/utils";

const loadingMessages = [
  "Teaching squirrels to navigate traffic...",
  "Consulting local pigeons for shortcuts...",
  "Calculating optimal coffee shop stops...",
  "Measuring sidewalk cracks for smoothness...",
  "Bribing traffic lights to stay green...",
  "Interviewing street signs for directions...",
  "Counting passing clouds for weather data...",
  "Teaching GPS to speak dolphin...",
  "Negotiating with potholes...",
  "Measuring distance in bananas...",
  "Recruiting snails as pace cars...",
  "Polling local cats about sunbathing spots...",
  "Converting distance to pizza slices...",
  "Teaching raccoons proper crosswalk usage...",
  "Synchronizing watches with subway rats...",
  "Calculating detours based on ice cream trucks...",
  "Mapping scenic routes for sleepwalkers...",
  "Consulting wise old park benches...",
  "Training pigeons in traffic control...",
  "Measuring road width in rubber ducks...",
  "Organizing flash mobs for street crossings...",
  "Teaching trees to give better directions...",
  "Calibrating route based on squirrel migrations...",
  "Interviewing fire hydrants about foot traffic...",
  "Negotiating right of way with bike messengers...",
  "Converting travel time to coffee cups...",
  "Analyzing sidewalk chalk art for secret paths...",
  "Teaching parking meters to moonwalk...",
  "Calculating shortcuts through parallel universes...",
  "Recruiting local dogs as pace setters...",
];

function NoRoutes() {
  return (
    <MotiView
      from={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex size-full flex-col items-center justify-start"
    >
      <View className="flex flex-col items-center justify-start p-8 text-center">
        <View className="mb-6 animate-pulse">
          <Map className="size-12 text-[#FF5937]" />
        </View>

        <View className="p-4">
          <Text
            role="heading"
            aria-level={2}
            className="mb-3 text-xl font-bold dark:text-gray-100"
          >
            Our Squirrels Could Not Find a Route
          </Text>

          <Text className="mb-3 text-lg leading-6 dark:text-gray-200">
            Our highly trained squirrels searched every tree, alley, and
            shortcut, but couldn&apos;t find a path that matches your
            requirements. This usually happens when some route rules are playing
            too hard to get!
          </Text>

          <Text className="mb-3 text-lg leading-6 dark:text-gray-200">
            Try relaxing some of your preferences - for example, if you&apos;re
            avoiding paved roads while also steering clear of unpaved ones, even
            our most acrobatic squirrels can&apos;t help. Consider:
          </Text>

          <View className="mb-3 ml-2">
            <Text className="mb-2 text-lg leading-6 dark:text-gray-200">
              • Allowing some road types you previously excluded
            </Text>
            <Text className="mb-2 text-lg leading-6 dark:text-gray-200">
              • Expanding your permitted surface types
            </Text>
            <Text className="mb-2 text-lg leading-6 dark:text-gray-200">
              • Adjusting your start and finish points
            </Text>
          </View>

          <Text className="text-lg leading-6 dark:text-gray-200">
            Remember: Our squirrels are talented, but they can&apos;t defy
            geography... yet.
          </Text>
        </View>
      </View>
    </MotiView>
  );
}
function RouteGenError({ planId }: { planId: string }) {
  return (
    <MotiView
      from={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex size-full flex-col items-center justify-start"
    >
      <View className="flex flex-col items-center justify-start p-8 text-center">
        <View className="mb-6 animate-spin">
          <Bug className="size-12 text-[#FF5937]" />
        </View>
        <Text
          role="heading"
          aria-level={2}
          className="mb-4 text-2xl font-bold dark:text-gray-100"
        >
          Our Squirrels Took a Wrong Turn
        </Text>
        <Text className="animate-pulse text-lg text-gray-600 dark:text-gray-200">
          Looks like our navigation squirrels got distracted by some
          particularly shiny acorns. Don&apos;t worry - we&apos;ve already sent
          our most experienced squirrel squad to investigate!
        </Text>
      </View>

      <ErrorBox refId={planId} />
    </MotiView>
  );
}
function GeneratingRoutes({ createdAt }: { createdAt: Date }) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(Math.floor(Math.random() * loadingMessages.length));
      if (Date.now() > createdAt.getTime() + 10000) {
        setShowExplanation(true);
      }
    }, 3000);
    return () => {
      clearInterval(interval);
    };
  }, [createdAt]);

  return (
    <MotiView
      from={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex size-full flex-col items-center justify-start"
    >
      <View className="flex flex-col items-center justify-start p-8 text-center">
        <View className="mb-6 animate-spin">
          <Compass className="size-12 text-[#FF5937]" />
        </View>
        <Text
          role="heading"
          aria-level={2}
          className="mb-4 text-2xl font-bold dark:text-gray-100"
        >
          Generating Your Routes
        </Text>
        <Text className="animate-pulse text-lg text-gray-600 dark:text-gray-200">
          {loadingMessages[messageIndex]}
        </Text>
      </View>

      <AnimatePresence>
        {showExplanation && (
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-8 rounded-2xl border-2 border-[#FF5937] bg-[#FFF5F3] p-6 dark:bg-gray-700"
          >
            <Text
              role="heading"
              aria-level={3}
              className="mb-4 text-xl font-bold text-[#FF5937]"
            >
              Why is it taking so long?
            </Text>
            <View className="space-y-4">
              <Text className="text-lg text-gray-700 dark:text-gray-200">
                We&apos;re currently in beta, which means our route-finding
                squirrels are still in training! While they&apos;re working hard
                to find the perfect routes for you, it might take a little
                longer.
              </Text>
              <View className="flex flex-row items-center gap-2">
                <Bell className="size-8 p-4 text-[#FF5937]" />
                <Text className="text-lg font-medium text-[#FF5937]">
                  Don&apos;t worry - we&apos;ll send you a notification when
                  your routes are ready! Feel free to create more plans in the
                  meantime.
                </Text>
              </View>
            </View>
          </MotiView>
        )}
      </AnimatePresence>
    </MotiView>
  );
}

export default function PlanDetails() {
  const { planId } = useLocalSearchParams();
  const { data: plans, error, status, refetch } = useStorePlans();
  const plan = plans?.find((p) => p.id === planId);

  return (
    <ScreenFrame title="Plan routes">
      <AnimatePresence exitBeforeEnter>
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
            <ScrollView className="h-[calc(100vh-100px)]">
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
                        <Text className="font-bold dark:text-gray-100">
                          Status
                        </Text>
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
                {plan.state !== "done" && plan.state !== "error" && (
                  <GeneratingRoutes createdAt={new Date(plan.createdAt)} />
                )}
                {plan.state === "error" && <RouteGenError planId={plan.id} />}
                {plan.state === "done" && plan.routes.length === 0 && (
                  <NoRoutes />
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
              </View>
            </ScrollView>
          </MotiView>
        )}
      </AnimatePresence>
    </ScreenFrame>
  );
}
