import { Link, useLocalSearchParams, useRouter } from "expo-router";
import {
  Bug,
  CirclePause,
  CirclePlay,
  Compass,
  Map,
  Navigation,
  Ruler,
  Trash2,
} from "lucide-react-native";
import { AnimatePresence, MotiView } from "moti";
import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";

import { Button } from "~/components/button";
import { ErrorBox } from "~/components/error";
import {
  getCardinalDirection,
  metersToDisplay,
} from "~/components/geo-map/util";
import { RouteCard } from "~/components/route-card";
import { ScreenCard } from "~/components/screen-card";
import { ScreenFrame } from "~/components/screen-frame";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import {
  usePlan,
  usePlanRoutes,
  usePlanUpdate as usePlansUpdate,
} from "~/lib/data-stores/plans";
import { posthogClient } from "~/lib/posthog/client";
import { cn } from "~/lib/utils";

function DeleteConfirmDialog({
  children,
  onDelete,
}: {
  children: React.ReactNode;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog
      className="w-full"
      open={open}
      onOpenChange={(open) => setOpen(open)}
    >
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="w-full border-black bg-white dark:border-gray-700 dark:bg-gray-800">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex flex-row items-center justify-between dark:text-gray-100">
            Delete Rule Set
          </AlertDialogTitle>
          <AlertDialogDescription>
            <Text className="dark:text-gray-200">
              Are you sure you want to delete this plan? This action is
              permanent.
            </Text>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex w-full flex-col items-center justify-between">
          <View className="flex w-full flex-col items-center justify-between gap-6">
            <Button
              variant="primary"
              className="flex w-full flex-row items-center justify-center"
              onPress={() => {
                setOpen(false);
                onDelete();
              }}
            >
              <Text className="dark:text-gray-200">Delete</Text>
            </Button>
            <Button
              variant="secondary"
              className="flex w-full flex-row items-center justify-center"
              onPress={() => setOpen(false)}
            >
              <Text className="dark:text-gray-200">Cancel</Text>
            </Button>
          </View>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const loadingMessages = [
  "Teaching squirrels to navigate traffic...",
  "Consulting local pigeons for shortcuts...",
  "Bribing traffic lights to stay green...",
  "Interviewing street signs for directions...",
  "Teaching GPS to speak dolphin...",
  "Recruiting local dogs as pace setters...",
];

function NoRoutes({ tripType }: { tripType: "start-finish" | "round-trip" }) {
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
            Could Not Find a Route
          </Text>
          <Text className="mb-3 text-lg leading-6 dark:text-gray-200">
            Try changing:
          </Text>

          {tripType === "start-finish" && (
            <View className="mb-3 ml-2">
              <Text className="mb-2 text-lg leading-6 dark:text-gray-200">
                • Start or finish coordinates
              </Text>
              <Text className="mb-2 text-lg leading-6 dark:text-gray-200">
                • Selected rules
              </Text>
            </View>
          )}
          {tripType === "round-trip" && (
            <View className="mb-3 ml-2">
              <Text className="mb-2 text-lg leading-6 dark:text-gray-200">
                • Start coordinates
              </Text>
              <Text className="mb-2 text-lg leading-6 dark:text-gray-200">
                • Travel direction
              </Text>
              <Text className="mb-2 text-lg leading-6 dark:text-gray-200">
                • Travel distance
              </Text>
              <Text className="mb-2 text-lg leading-6 dark:text-gray-200">
                • Selected rules
              </Text>
            </View>
          )}
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
          An error occured
        </Text>
        <Text className="animate-pulse text-lg text-gray-600 dark:text-gray-200">
          There has been an error in the route generation. An error repor thas
          been sent and is being looked at!
        </Text>
        <Text className="animate-pulse text-lg text-gray-600 dark:text-gray-200">
          In the mean time please try a different plan
        </Text>
      </View>

      <ErrorBox refId={planId} />
    </MotiView>
  );
}
function GeneratingRoutes({
  createdAt,
  planningWider,
}: {
  createdAt: Date;
  planningWider: boolean;
}) {
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
        {!!planningWider && (
          <MotiView
            key="wider-search"
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 rounded-2xl border border-[#FF5937] bg-[#FFF5F3] p-6 dark:bg-gray-700"
          >
            <Text
              role="heading"
              aria-level={3}
              className="mb-4 text-lg font-bold text-[#FF5937]"
            >
              No routes were found so a wider search is executed
            </Text>
          </MotiView>
        )}

        {showExplanation && (
          <MotiView
            key="so-long"
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
                Route generation will take longer for longer distances and more
                complex rules. If this feels too long, try creating shorter
                plans.
              </Text>
              <View className="flex flex-row items-center gap-2">
                <Text className="flex-1 text-lg font-medium text-[#FF5937]">
                  You can come back later and the routes will be waiting for
                  you! Go and create more plans in the meantime!
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
  const router = useRouter();
  const { planId } = useLocalSearchParams();
  const plan = usePlan(planId);
  const { planDelete } = usePlansUpdate();
  const routes = usePlanRoutes(planId);
  return (
    <ScreenFrame title="Plan routes" onGoBack={() => router.replace("/plans")}>
      <View className="flex w-full flex-col items-center justify-start">
        <AnimatePresence exitBeforeEnter>
          {plan && (
            <MotiView
              key="plan"
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mx-2 w-full max-w-5xl"
            >
              <ScrollView className="h-[calc(100vh-100px)] pb-12">
                <View className="mx-2 w-full pr-4 md:max-w-5xl">
                  <ScreenCard
                    middle={
                      <>
                        <View className="space-y-4">
                          <View className="flex flex-row items-start gap-3">
                            <View>
                              <CirclePlay className="mt-1 size-6 text-[#FF5937]" />
                            </View>
                            <View className="flex-1">
                              <Text className="text-sm font-bold text-[#FF5937]">
                                Start
                              </Text>
                              <Text className="truncate text-base font-medium dark:text-gray-200">
                                {plan.startDesc}
                              </Text>
                            </View>
                          </View>
                          {plan.tripType === "start-finish" && (
                            <View className="flex flex-row items-start gap-3">
                              <View>
                                <CirclePause className="mt-1 size-6 text-[#FF5937]" />
                              </View>
                              <View className="flex-1">
                                <Text className="text-sm font-bold text-[#FF5937]">
                                  Finish
                                </Text>
                                <Text className="truncate text-base font-medium dark:text-gray-200">
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
                          <View className="flex flex-row items-start gap-3">
                            <Ruler className="mt-1 size-6 text-[#FF5937]" />
                            <View>
                              <Text className="text-sm font-bold text-[#FF5937]">
                                {plan.tripType === "round-trip"
                                  ? "Target distance"
                                  : "Straight line distance"}
                              </Text>
                              <Text className="text-base font-medium dark:text-gray-200">
                                {metersToDisplay(plan.distance)}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </>
                    }
                    bottom={
                      <View className="flex flex-row items-center justify-between">
                        <View className="flex flex-col items-end justify-center">
                          <Text className="font-bold dark:text-gray-100">
                            Status
                          </Text>
                          <Text
                            className={cn("font-bold", {
                              "text-gray-600":
                                plan.state === "new" ||
                                plan.state === "planning",
                              "text-green-500": plan.state === "done",
                              "text-red-500": plan.state === "error",
                            })}
                          >
                            {plan.state}
                          </Text>
                        </View>
                        <View className="flex flex-col items-end justify-center">
                          <DeleteConfirmDialog
                            onDelete={() => {
                              posthogClient.captureEvent("plan-deleted", {
                                planId: plan.id,
                              });
                              planDelete(plan.id);
                              router.replace("/plans");
                            }}
                          >
                            <Pressable
                              className={cn(
                                "dark:border-red-700 dark:hover:bg-red-950 w-full h-14 flex-row items-center px-4 gap-3 rounded-xl border-[3px] border-red-500 text-red-500 hover:bg-red-50 transition-colors",
                              )}
                            >
                              <Trash2 className="size-4" />
                            </Pressable>
                          </DeleteConfirmDialog>
                        </View>
                      </View>
                    }
                  />
                  {(plan.state === "new" ||
                    plan.state === "planning" ||
                    plan.state === "planning-wider") && (
                    <GeneratingRoutes
                      planningWider={plan.state === "planning-wider"}
                      createdAt={new Date(plan.createdAt)}
                    />
                  )}
                  {plan.state === "error" && <RouteGenError planId={plan.id} />}
                  {plan.state === "done" && routes.length === 0 && (
                    <NoRoutes tripType={plan.tripType} />
                  )}
                  {plan.state === "done" && routes.length > 0 && (
                    <>
                      <Text
                        role="heading"
                        aria-level={2}
                        className="my-6 text-2xl font-bold dark:text-gray-100"
                      >
                        Available Routes
                      </Text>
                      <View className="grid grid-cols-1 gap-6 pb-24 md:grid-cols-2 lg:grid-cols-3">
                        {routes.map((route) => (
                          <Link
                            key={route.id}
                            href={`/plans/${plan.id}/${route.id}`}
                          >
                            <RouteCard routeShort={route} />
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
      </View>
    </ScreenFrame>
  );
}
