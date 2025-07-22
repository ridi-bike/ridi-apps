import { useLocalSearchParams, useRouter } from "expo-router";
import slugify from "@sindresorhus/slugify";
import { buildGPX, BaseBuilder } from "gpx-builder";
import { Trophy, Trash2, Ruler } from "lucide-react-native";
import { AnimatePresence, MotiView } from "moti";
import { useMemo, useState, useCallback } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";

import { Button } from "~/components/button";
import { ErrorBox } from "~/components/error";
import { GeoMapRouteView } from "~/components/geo-map/geo-map-route-view";
import { metersToDisplay } from "~/components/geo-map/util";
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
import { posthogClient } from "~/lib/posthog/client";
import { useStorePlans } from "~/lib/stores/plans-store";
import { useStoreRoute } from "~/lib/stores/routes-store";
import { useUser } from "~/lib/useUser";
import { cn } from "~/lib/utils";

function DownloadGpxDialog({
  children,
  onDownload,
  downloadedAt,
}: {
  children: React.ReactNode;
  onDownload: () => void;
  downloadedAt: string | null;
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
              <View className="flex flex-col gap-1">
                {user.user.isAnonymous && (
                  <Text className="dark:text-gray-100">
                    Log in to download GPX
                  </Text>
                )}
                {!user.user.isAnonymous && (
                  <>
                    {!downloadedAt && (
                      <>
                        {user.user.subType === "none" &&
                          user.user.downloadCountRemain <= 0 && (
                            <Text className="dark:text-gray-100">
                              Become a Ridi supporter to download GPX
                            </Text>
                          )}
                        {(user.user.subType !== "none" ||
                          user.user.downloadCountRemain > 0) && (
                          <View className="flex flex-col gap-1">
                            {user.user.subType === "none" && (
                              <Text className="dark:text-gray-100">
                                Available downloads:{" "}
                                {user.user.downloadCountRemain}
                              </Text>
                            )}
                            <Text className="dark:text-gray-100">
                              Start the GPX download and open the file in your
                              favourite navigatior
                            </Text>
                          </View>
                        )}
                      </>
                    )}
                    {!!downloadedAt && (
                      <Text className="dark:text-gray-100">
                        Start the GPX download and open the file in your
                        favourite navigatior
                      </Text>
                    )}
                  </>
                )}
              </View>
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
            {user.user && !user.user.isAnonymous && (
              <>
                {!!downloadedAt && (
                  <Button
                    variant="primary"
                    className="flex w-full flex-row items-center justify-center"
                    onPress={() => {
                      setOpen(false);
                      onDownload();
                    }}
                  >
                    <Text className="dark:text-gray-200">Download</Text>
                  </Button>
                )}
                {!downloadedAt && (
                  <>
                    {user.user.subType === "none" &&
                      user.user.downloadCountRemain <= 0 && (
                        <Button
                          variant="primary"
                          className="flex w-full flex-row items-center justify-center"
                          onPress={() => {
                            router.replace("/settings/billing");
                          }}
                        >
                          <Text className="dark:text-gray-200">
                            Become a supporter
                          </Text>
                        </Button>
                      )}
                    {(user.user.subType !== "none" ||
                      user.user.downloadCountRemain > 0) && (
                      <Button
                        variant="primary"
                        className="flex w-full flex-row items-center justify-center"
                        onPress={() => {
                          setOpen(false);
                          onDownload();
                        }}
                      >
                        <Text className="dark:text-gray-200">Download</Text>
                      </Button>
                    )}
                  </>
                )}
              </>
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
            <Text className="dark:text-gray-200">
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
  const {
    data: route,
    error,
    status,
    routeDelete,
    routeSetDownloaded,
  } = useStoreRoute(Array.isArray(routeId) ? "" : routeId || "");

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

  const getFileName = useCallback(() => {
    function descOrLatLon(
      desc: string | undefined,
      lat: number,
      lon: number,
    ): string {
      const latLon = `${lat.toFixed(3)}-${lon.toFixed(3)}`;
      return desc
        ? slugify(desc).split(",")[0]?.slice(0, 30) || latLon
        : latLon;
    }
    const date = new Date(plan.createdAt).toISOString().substring(0, 10);
    const startLoc = descOrLatLon(plan.startDesc, plan.startLat, plan.startLon);
    const finishLoc =
      plan.tripType === "start-finish"
        ? descOrLatLon(plan.finishDesc, plan.finishLat, plan.finishLon)
        : null;
    const dist = Math.round(route.data.stats.lenM / 1000);
    return plan.tripType === "start-finish"
      ? `${startLoc}_${finishLoc}_${dist}km_${date}.gpx`
      : `${startLoc}_${plan.bearing}deg_${dist}km_${date}.gpx`;
  }, [plan, route]);

  return (
    <ScreenFrame
      title="Route details"
      onGoBack={() =>
        router.canGoBack() ? router.back() : router.replace(`/plans/${planId}`)
      }
    >
      <View className="flex w-full flex-col items-center justify-start">
        <AnimatePresence>
          {!route && !error && (
            <View
              key="loading"
              className="flex w-full flex-row items-center justify-center"
            >
              <Loading className="size-12 text-[#ff4a25]" />
            </View>
          )}
          {!!error && status !== "pending" && (
            <ErrorBox key="error" error={error} retry={refetch} />
          )}
          {!!planError && planStatus !== "pending" && (
            <ErrorBox key="other-error" error={planError} retry={refetch} />
          )}
          {!!route &&
            !!breakdownSurface &&
            !!breakdownRoadType &&
            !!routeOverview && (
              <MotiView
                key="plan"
                from={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mx-2 w-full max-w-5xl gap-4"
              >
                <ScrollView className="h-[calc(100vh-100px)] pb-12">
                  <View className="mx-2 max-w-5xl flex-1 gap-4 pb-24">
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
                            {!!plan && (
                              <>
                                <Text className="text-lg font-bold dark:text-gray-200">
                                  {plan.startDesc}
                                </Text>
                                {!!plan.finishDesc && (
                                  <Text className="text-lg font-bold dark:text-gray-200">
                                    {plan.finishDesc}
                                  </Text>
                                )}
                              </>
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
                                  posthogClient.captureEvent("route-deleted", {
                                    routeId: route.data.id,
                                  });
                                  routeDelete(route.data.id);
                                  if (router.canGoBack()) {
                                    router.back();
                                  } else {
                                    router.replace(`/plans/${planId}`);
                                  }
                                }}
                              >
                                <Pressable
                                  role="button"
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
                                downloadedAt={route.data.downloadedAt}
                                onDownload={() => {
                                  posthogClient.captureEvent(
                                    "route-gpx-downloaded",
                                    {
                                      routeId: route.data.id,
                                    },
                                  );

                                  const { Point } = BaseBuilder.MODELS;
                                  const points = route.data.latLonArray.map(
                                    (latLon) => new Point(latLon[0], latLon[1]),
                                  );

                                  const gpxData = new BaseBuilder();

                                  gpxData.setSegmentPoints(points);

                                  const link = document.createElement("a");

                                  link.href = `data:application/gpx+xml;charset=utf-8,${encodeURIComponent(buildGPX(gpxData.toObject()))}`;
                                  link.download = getFileName();
                                  link.click();

                                  routeSetDownloaded({
                                    id: route.data.id,
                                    downloadedAt: new Date(),
                                  });
                                }}
                              >
                                <Pressable
                                  role="button"
                                  className={cn(
                                    "dark:border-green-700 dark:hover:bg-green-950 w-full h-14 flex-row items-center px-4 gap-3 rounded-xl border-[3px] border-green-500 text-green-500 hover:bg-green-50 transition-colors",
                                  )}
                                >
                                  <Text className="dark:text-gray-200">
                                    Download Route GPX
                                  </Text>
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
                                    {Math.round(breakdownSurface[0].percentage)}
                                    %
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
                                    {Math.round(breakdownSurface[1].percentage)}
                                    %
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
                                    {Math.round(breakdownSurface[2].percentage)}
                                    %
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
                                    {Math.round(
                                      breakdownRoadType[0].percentage,
                                    )}
                                    %
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
                                    {Math.round(
                                      breakdownRoadType[1].percentage,
                                    )}
                                    %
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
                                    {Math.round(
                                      breakdownRoadType[2].percentage,
                                    )}
                                    %
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
      </View>
    </ScreenFrame>
  );
}
