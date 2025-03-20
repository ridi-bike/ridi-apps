import { useLocalSearchParams, useRouter } from "expo-router";
import { buildGPX, BaseBuilder } from "gpx-builder";
import { Trophy, Trash2, Route, Ruler } from "lucide-react-native";
import { AnimatePresence, MotiView } from "moti";
import { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";

import { Button } from "~/components/button";
import { ErrorBox } from "~/components/error";
import { GeoMapRouteView } from "~/components/geo-map/geo-map-route-view";
import { metersToDisplay } from "~/components/geo-map/util";
import { GpxIcon } from "~/components/icons/gpx";
import { Loading } from "~/components/loading";
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
import { useStorePlans } from "~/lib/stores/plans-store";
import { useStoreRoute } from "~/lib/stores/routes-store";
import { useUser } from "~/lib/useUser";
import { cn } from "~/lib/utils";

function DownloadGpxDialog({
  children,
  onDownload,
}: {
  children: React.ReactNode;
  onDownload: () => void;
}) {
  const router = useRouter();
  const user = useUser();
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
            Download GPX route file
          </AlertDialogTitle>
          <AlertDialogDescription>
            {user.user && (
              <>
                {user.user.subType === "none" && (
                  <Text>GPX download is a premium feature</Text>
                )}
                {user.user.subType !== "none" && (
                  <Text>
                    Start the GPX download and open the file in your favourite
                    navigatior
                  </Text>
                )}
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex w-full flex-col items-center justify-between">
          <View className="flex w-full flex-col items-center justify-between gap-6">
            {user.user && user.user.isAnonymous && (
              <Button
                variant="primary"
                className="flex w-full flex-row items-center justify-center"
                onPress={() => {
                  router.replace("/login");
                }}
              >
                <Text className="dark:text-gray-200">Login</Text>
              </Button>
            )}
            {user.user &&
              !user.user.isAnonymous &&
              user.user.subType === "none" && (
                <Button
                  variant="primary"
                  className="flex w-full flex-row items-center justify-center"
                  onPress={() => {
                    router.replace("/settings/billing");
                  }}
                >
                  <Text className="dark:text-gray-200">Login</Text>
                </Button>
              )}
            {user.user &&
              !user.user.isAnonymous &&
              user.user.subType !== "none" && (
                <Button
                  variant="primary"
                  className="flex w-full flex-row items-center justify-center"
                  onPress={() => {
                    setOpen(false);
                    onDownload();
                  }}
                >
                  <Text className="dark:text-gray-200">Billing</Text>
                </Button>
              )}
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
            <Text>
              Are you sure you want to delete this route? This action is
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

export default function RouteDetails() {
  const router = useRouter();
  const { routeId, planId } = useLocalSearchParams();
  const {
    data: plans,
    error: planError,
    status: planStatus,
    refetch,
  } = useStorePlans();
  const plan = plans?.find((p) => p.id === planId);
  const planRoute = plan?.routes.find((r) => r.routeId === routeId);
  const {
    data: route,
    error,
    status,
    routeDelete,
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

  return (
    <ScreenFrame
      title="Route details"
      onGoBack={() => router.replace(`/plans/${planId}`)}
    >
      <AnimatePresence>
        {(!plans && !planError) ||
          (!route && !error && <Loading className="size-12 text-[#ff4a25]" />)}
        {!!error && status !== "pending" && (
          <ErrorBox error={error} retry={refetch} />
        )}
        {!!planError && planStatus !== "pending" && (
          <ErrorBox error={planError} retry={refetch} />
        )}
        {!!plan &&
          !!route &&
          !!breakdownSurface &&
          !!breakdownRoadType &&
          !!routeOverview && (
            <MotiView
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mx-2 max-w-5xl flex-1 gap-4"
            >
              <ScrollView className="h-[calc(100vh-100px)]">
                <View className="mx-2 max-w-5xl flex-1 gap-4">
                  <ScreenCard
                    topClassName="h-[65vh]"
                    top={
                      <GeoMapRouteView
                        route={routeOverview}
                        interactive={true}
                      />
                    }
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
                      <View className="flex flex-row items-center justify-between">
                        <View className="flex flex-row items-center justify-start gap-2">
                          <Ruler className="size-5 text-[#FF5937]" />
                          <Text className="font-bold dark:text-gray-200">
                            {metersToDisplay(route.data.stats.lenM)}
                          </Text>
                        </View>
                        <View className="flex flex-row items-center justify-center gap-4">
                          <View className="flex flex-col items-end justify-center">
                            <DeleteConfirmDialog
                              onDelete={() => {
                                routeDelete(route.data.id);
                                router.replace(`/plans/${planId}`);
                              }}
                            >
                              <Pressable
                                className={cn(
                                  "dark:border-red-700 dark:hover:bg-red-950 w-full h-14 flex-row items-center px-4 gap-3 rounded-xl border-[3px] border-red-500 text-red-500 hover:bg-red-50 transition-colors",
                                )}
                              >
                                <Trash2 className="size-6" />
                              </Pressable>
                            </DeleteConfirmDialog>
                          </View>
                          <View className="flex flex-col items-end justify-center">
                            <DownloadGpxDialog
                              onDownload={() => {
                                const { Point } = BaseBuilder.MODELS;
                                const points = route.data.latLonArray.map(
                                  (latLon) => new Point(latLon[0], latLon[1]),
                                );

                                const gpxData = new BaseBuilder();

                                gpxData.setSegmentPoints(points);

                                const link = document.createElement("a");

                                link.href = `data:application/gpx+xml;charset=utf-8,${encodeURIComponent(buildGPX(gpxData.toObject()))}`;
                                link.download = "route.gpx";
                                link.click();
                              }}
                            >
                              <Pressable
                                className={cn(
                                  "dark:border-green-700 dark:hover:bg-green-950 w-full h-14 flex-row items-center px-4 gap-3 rounded-xl border-[3px] border-green-500 text-green-500 hover:bg-green-50 transition-colors",
                                )}
                              >
                                <GpxIcon className="size-6 fill-green-700" />
                              </Pressable>
                            </DownloadGpxDialog>
                          </View>
                        </View>
                      </View>
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
              </ScrollView>
            </MotiView>
          )}
      </AnimatePresence>
    </ScreenFrame>
  );
}
