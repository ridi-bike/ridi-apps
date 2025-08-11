import { Slider } from "@miblanchard/react-native-slider";
import { type Region } from "@ridi/store-with-schema";
import * as turf from "@turf/turf";
import * as Location from "expo-location";
import { Link, useRouter } from "expo-router";
import {
  CirclePauseIcon,
  CirclePlayIcon,
  Compass,
  Hourglass,
  Locate,
  MapPinned,
  MoveRight,
  RotateCw,
  Route,
  Search,
  Settings,
  StretchHorizontal,
  Waypoints,
} from "lucide-react-native";
import { AnimatePresence, MotiView, ScrollView } from "moti";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import * as z from "zod";

import { GeoMapCoordsSelector } from "~/components/geo-map/geo-map-coords-selector";
import { GeoMapPlanView } from "~/components/geo-map/geo-map-plan-view";
import { DIRECTIONS, getCardinalDirection } from "~/components/geo-map/util";
import { LocationPermsNotGiven } from "~/components/LocationPermsNotGiven";
import { ScreenFrame } from "~/components/screen-frame";
import { coordsAddressGet } from "~/lib/coords-details";
import { dataStore } from "~/lib/data-stores/data-store";
import { usePlans, usePlansUpdate } from "~/lib/data-stores/plans";
import { findRegions } from "~/lib/data-stores/regions";
import { useRuleSets, useRuleSetDefaultId } from "~/lib/data-stores/rule-sets";
import { AdvIcon } from "~/lib/icons/adv";
import { DualsportIcon } from "~/lib/icons/dualsport";
import { TouringIcon } from "~/lib/icons/touring";
import { posthogClient } from "~/lib/posthog/client.mobile";
import { useUrlParams } from "~/lib/url-params";
import { cn } from "~/lib/utils";

const DISTANCES = [100, 150, 200, 250, 300, 350];

const coordsSchema = z.tuple([z.number(), z.number()]);
type Coords = z.infer<typeof coordsSchema>;

function GroupWithTitle({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View
      className={cn(
        "mb-4 flex w-full flex-col items-start justify-start rounded-xl border-2 border-black bg-white p-2 dark:border-gray-700 dark:bg-gray-900",
        className,
      )}
    >
      <View className="h-2">
        <Text className="relative -top-5 bg-white p-1 pl-2 text-sm dark:bg-gray-900 dark:text-gray-200">
          {title}
        </Text>
      </View>
      <View className="flex w-full flex-1 flex-row gap-2">{children}</View>
    </View>
  );
}

const CANCEL_TRIGGER_TIMES = 5;

export default function PlansNew() {
  const router = useRouter();
  const [startCoords, setStartCoords] = useUrlParams("start", coordsSchema);
  const [finishCoords, setFinishCoords] = useUrlParams("finish", coordsSchema);
  const [cancelPressedTimes, setCancelPressedTimes] = useState(0);
  const [startDesc, setStartDesc] = useState<string | null>(null);
  const [finishDesc, setFinishDesc] = useState<string | null>(null);
  const [isRoundTrip, setIsRoundTrip] = useUrlParams("round-trip", z.boolean());
  const [selectedDistance, setSelectedDistance] = useUrlParams(
    "distance",
    z.number(),
  );
  const [bearing, setBearing] = useUrlParams("bearing", z.number());
  const [centerSelectionMode, setCenterSelectionMode] = useUrlParams(
    "centerSelect",
    z.boolean(),
  );
  const [searchPoints, setSearchPoints] = useUrlParams(
    "search-results",
    z.array(coordsSchema),
  );

  useEffect(() => {
    //@ts-expect-error func from google tag script
    if (typeof gtag === "function") {
      //@ts-expect-error func from google tag script
      gtag("event", "conversion", {
        send_to: "AW-17048245597/OxNtCOy978AaEN2qnsE_",
        value: 1.0,
        currency: "EUR",
        transaction_id: "",
      });
    }
  }, []);

  const [showLocationAlert, setShowLocationAlert] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<Coords | null>(null);

  const [startRegions, setStartRegions] = useState<Region[] | null>(null);
  useEffect(() => {
    if (startCoords) {
      findRegions(startCoords).then((regions) => setStartRegions(regions));
    } else {
      setStartRegions(null);
    }
  }, [startCoords]);
  const [finishRegions, setFinishRegions] = useState<Region[] | null>(null);
  useEffect(() => {
    if (finishCoords) {
      findRegions(finishCoords).then((regions) => setFinishRegions(regions));
    } else {
      setFinishRegions(null);
    }
  }, [finishCoords]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  useEffect(() => {
    if ((startCoords && startRegions) || (finishCoords && finishRegions)) {
      if (
        (startRegions && !startRegions.length) ||
        (finishRegions && !finishRegions.length)
      ) {
        posthogClient.captureEvent("plan-new-unsupported-region", {
          startCoords,
          finishCoords,
        });
        setErrorMessage("Journey start or finish in unsupported region");
      } else {
        const overlapping =
          startRegions?.filter((sr) =>
            finishRegions?.find((fr) => fr.region === sr.region),
          ) || [];
        if (startRegions && finishRegions && !overlapping.length) {
          posthogClient.captureEvent("plan-new-different-regions", {
            startRegions,
            finishRegions,
          });
          setErrorMessage("Journey start and finish is in different regions");
        } else {
          setErrorMessage(null);
        }
      }
    } else {
      setErrorMessage(null);
    }
  }, [finishCoords, finishRegions, startCoords, startRegions]);

  useEffect(() => {
    // set timeout is needed to let the stack mount first and then update params
    // this happens when reloading browser with isRoundTrip query param
    setTimeout(() => {
      if (isRoundTrip) {
        if (finishCoords) {
          setFinishCoords();
        }
        if (bearing === undefined) {
          setBearing(0);
        }
        if (selectedDistance === undefined) {
          setSelectedDistance(100);
        }
      }
    }, 0);
  }, [
    bearing,
    finishCoords,
    isRoundTrip,
    selectedDistance,
    setBearing,
    setFinishCoords,
    setSelectedDistance,
  ]);

  const [ruleSetId, setRuleSetId] = useUrlParams("rule", z.string());
  const ruleSets = useRuleSets();
  const defaultRuleSetId = useRuleSetDefaultId();
  useEffect(() => {
    if (!ruleSetId && defaultRuleSetId) {
      setRuleSetId(defaultRuleSetId);
    }
  }, [ruleSetId, defaultRuleSetId, setRuleSetId]);

  useEffect(() => {
    if (startCoords) {
      coordsAddressGet({
        lat: startCoords[0],
        lon: startCoords[1],
      }).then((v) => setStartDesc(v));
    }
  }, [startCoords]);

  useEffect(() => {
    if (finishCoords) {
      coordsAddressGet({
        lat: finishCoords[0],
        lon: finishCoords[1],
      }).then((v) => setFinishDesc(v));
    }
  }, [finishCoords]);

  const getCurrentLocation = useCallback(async () => {
    if (currentCoords) {
      posthogClient.captureEvent("plan-new-current-location-clear");
      setCurrentCoords(null);
      return;
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      posthogClient.captureEvent("plan-new-current-location-not-granted");
      setShowLocationAlert(true);
      return;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 1000, // 1km
      timeInterval: 10 * 60 * 1000, // 10 min
    });

    if (location) {
      posthogClient.captureEvent("plan-new-current-location-gotten");
      setCurrentCoords([location.coords.latitude, location.coords.longitude]);
    } else {
      posthogClient.captureEvent("plan-new-current-location-not-available");
    }
  }, [currentCoords]);

  const canCreateRoute = useMemo(() => {
    return (
      ((!isRoundTrip && startCoords && finishCoords && ruleSetId) ||
        (isRoundTrip &&
          startCoords &&
          bearing !== undefined &&
          selectedDistance &&
          ruleSetId)) &&
      !errorMessage
    );
  }, [
    bearing,
    errorMessage,
    finishCoords,
    isRoundTrip,
    ruleSetId,
    selectedDistance,
    startCoords,
  ]);

  const [mapMode, setMapMode] = useUrlParams("map-mode", z.boolean());

  const { planCreate } = usePlansUpdate();

  const plans = usePlans();
  const initialCoords = useMemo((): [number, number] => {
    const prevPlan = plans?.[0];
    if (!prevPlan) {
      return [57.153614, 24.85391];
    }
    return [prevPlan.startLat, prevPlan.startLon];
  }, [plans]);

  console.log("ruleSets", useRuleSets());
  const allRegions = dataStore.getTable("regions");
  console.log({ allRegions });

  return (
    <ScreenFrame
      title="New plan"
      onGoBack={() => {
        if (mapMode) {
          setMapMode(false);

          posthogClient.captureEvent("plan-new-map-mode", {
            mapMode,
            trigger: "back-button",
          });
        } else {
          router.replace("/plans");
        }
      }}
      floating={
        <View className="flex w-full flex-col items-center justify-start">
          <View className="fixed bottom-0 flex w-full flex-col items-center justify-center bg-white p-4 dark:bg-gray-800">
            <AnimatePresence>
              {!!errorMessage && (
                <MotiView
                  key="error"
                  from={{ height: 0 }}
                  animate={{ height: 50 }}
                  exit={{ height: 0 }}
                  className="flex h-14 flex-row items-center justify-center"
                >
                  <Text className="text-xl text-red-500">{errorMessage}</Text>
                </MotiView>
              )}
            </AnimatePresence>
            {mapMode && (
              <Pressable
                key="set-map-mode"
                role="button"
                onPress={() => {
                  setMapMode(false);
                  posthogClient.captureEvent("plan-new-map-mode", {
                    mapMode,
                    trigger: "ok-button",
                  });
                }}
                disabled={!canCreateRoute}
                aria-disabled={!canCreateRoute}
                className={cn(
                  "w-full rounded-xl px-4 py-3 font-medium text-white transition-colors",
                  {
                    "bg-[#FF5937] hover:bg-[#FF5937]/90": canCreateRoute,
                    "cursor-not-allowed bg-gray-200 dark:bg-gray-700":
                      !canCreateRoute,
                  },
                )}
              >
                <Text className="text-center text-white">OK</Text>
              </Pressable>
            )}
            {!mapMode && (
              <Pressable
                key="save"
                role="button"
                onPress={() => {
                  if (canCreateRoute) {
                    if (!startCoords || !ruleSetId) {
                      return;
                    }

                    posthogClient.captureEvent("plan-new-plan-create-ok");

                    let distance = (selectedDistance || 0) * 1000;
                    if (!isRoundTrip && finishCoords) {
                      const turfP1 = turf.point([
                        startCoords[1],
                        startCoords[0],
                      ]);
                      const turfP2 = turf.point([
                        finishCoords[1],
                        finishCoords[0],
                      ]);
                      distance = turf.distance(turfP1, turfP2, {
                        units: "meters",
                      });
                    }
                    const planId = planCreate({
                      startLat: startCoords[0],
                      startLon: startCoords[1],
                      finishLat: finishCoords ? finishCoords[0] : null,
                      finishLon: finishCoords ? finishCoords[1] : null,
                      bearing: isRoundTrip ? bearing || 0 : null,
                      distance,
                      tripType: isRoundTrip ? "round-trip" : "start-finish",
                      ruleSetId,
                    });
                    router.replace({
                      pathname: "/plans/[planId]",
                      params: { planId },
                    });
                  }
                }}
                disabled={!canCreateRoute}
                aria-disabled={!canCreateRoute}
                className={cn(
                  "w-full rounded-xl px-4 py-3 max-w-5xl font-medium text-white transition-colors",
                  {
                    "bg-[#FF5937] hover:bg-[#FF5937]/90": canCreateRoute,
                    "cursor-not-allowed bg-gray-200 dark:bg-gray-700":
                      !canCreateRoute,
                  },
                )}
              >
                <Text className="text-center text-white">OK</Text>
              </Pressable>
            )}
          </View>
        </View>
      }
    >
      <View className="flex flex-col items-center justify-start">
        <AnimatePresence>
          {mapMode && initialCoords && (
            <MotiView
              key="big-map"
              className="fixed top-0 z-50 mt-16 w-[98vw] bg-white p-4 pb-40 dark:bg-gray-900"
              from={{ height: "0%" }}
              animate={{ height: "100%" }}
              exit={{ height: "0%" }}
              transition={{ type: "timing" }}
            >
              <GeoMapCoordsSelector
                initialCoords={initialCoords}
                onCoordsSelectCancel={() => {
                  setCancelPressedTimes((t) => t + 1);
                  if (cancelPressedTimes >= CANCEL_TRIGGER_TIMES) {
                    setTimeout(() => setCancelPressedTimes(0), 20 * 1000);
                  }
                }}
                regions={
                  errorMessage
                    ? (startRegions || []).concat(finishRegions || [])
                    : null
                }
                isRoundTrip={isRoundTrip || false}
                start={
                  startCoords
                    ? { lat: startCoords[0], lon: startCoords[1] }
                    : null
                }
                finish={
                  finishCoords
                    ? { lat: finishCoords[0], lon: finishCoords[1] }
                    : null
                }
                current={
                  currentCoords
                    ? { lat: currentCoords[0], lon: currentCoords[1] }
                    : null
                }
                points={searchPoints?.map((c) => ({
                  coords: { lat: c[0], lon: c[1] },
                }))}
                selectionMode={centerSelectionMode ? "center" : "tap"}
                setStart={(c) => {
                  posthogClient.captureEvent("plan-new-coords-start-select", {
                    coords: c,
                  });
                  setStartCoords(c ? [c.lat, c.lon] : undefined);
                }}
                setFinish={(c) => {
                  posthogClient.captureEvent("plan-new-coords-finish-select", {
                    coords: c,
                  });
                  setFinishCoords(c ? [c.lat, c.lon] : undefined);
                }}
              >
                <View className="pointer-events-none flex w-full flex-row items-start justify-end">
                  <View className="float-right flex w-full flex-col items-end justify-start gap-2 p-4">
                    <View className="flex w-full flex-row items-center justify-between">
                      <View className="flex flex-1 flex-row items-center justify-center p-4">
                        <Text className="ml-10 rounded-lg bg-gray-400 px-2 py-1 text-sm text-gray-200">
                          {centerSelectionMode
                            ? "Tap on center to start"
                            : "Tap on map to start"}
                        </Text>
                      </View>
                      <Pressable
                        role="button"
                        onPress={getCurrentLocation}
                        aria-label="Get Current Location"
                        className={cn(
                          "flex flex-row items-center justify-start gap-2 rounded-xl border-2 p-4 pointer-events-auto",

                          {
                            "border-[#FF5937] bg-[#FF5937] text-white":
                              currentCoords,
                            "border-black bg-white dark:border-gray-700 dark:bg-gray-900":
                              !currentCoords,
                          },
                        )}
                      >
                        <Locate className="size-4 dark:text-gray-200" />
                      </Pressable>
                    </View>
                    <View className="pointer-events-auto flex flex-row items-center justify-center gap-2">
                      {cancelPressedTimes > CANCEL_TRIGGER_TIMES && (
                        <>
                          <Text className="ml-10 rounded-lg bg-gray-400 px-2 py-1 text-sm text-gray-200">
                            Try using map center selector
                          </Text>
                          <MoveRight className="size-6 dark:text-gray-200" />
                        </>
                      )}
                      <Pressable
                        role="button"
                        aria-label="Enable Map Center Point"
                        onPress={() => {
                          posthogClient.captureEvent(
                            "plan-new-selection-mode-set",
                            {
                              centerSelectionMode,
                            },
                          );
                          setCancelPressedTimes(0);
                          setCenterSelectionMode(!centerSelectionMode);
                        }}
                        className={cn(
                          "flex flex-1 flex-row items-center justify-start gap-2 rounded-xl border-2 p-4",
                          {
                            "border-[#FF5937] bg-[#FF5937] text-white":
                              centerSelectionMode,
                            "border-black bg-white dark:border-gray-700 dark:bg-gray-900":
                              !centerSelectionMode,
                          },
                        )}
                      >
                        <MapPinned className="size-4 dark:text-gray-200" />
                      </Pressable>
                    </View>
                    {!searchPoints && (
                      <Link
                        href={`/search?isRoundTrip=${JSON.stringify(isRoundTrip || false)}`}
                        className="pointer-events-auto flex flex-1 flex-row items-center justify-start gap-2 rounded-xl border-2 border-black bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
                        aria-label="Search"
                      >
                        <Search className="size-4 dark:text-gray-200" />
                      </Link>
                    )}
                    {searchPoints?.length && (
                      <Pressable
                        role="button"
                        onPress={() => {
                          posthogClient.captureEvent("plan-new-search-clear");
                          setSearchPoints();
                        }}
                        className="pointer-events-auto flex flex-1 flex-row items-center justify-start gap-2 rounded-xl border-2 border-[#FF5937] bg-[#FF5937] p-4 text-white"
                        aria-label="Clear Search"
                      >
                        <Search className="size-4 dark:text-gray-200" />
                      </Pressable>
                    )}
                  </View>
                </View>
              </GeoMapCoordsSelector>
            </MotiView>
          )}
        </AnimatePresence>
        {showLocationAlert && (
          <LocationPermsNotGiven
            close={() => {
              setShowLocationAlert(false);
            }}
          />
        )}
        <ScrollView className="max-h-[calc(100vh-170px)] w-full max-w-5xl px-4 pb-36 pt-4">
          <Pressable
            role="button"
            onPress={() => {
              posthogClient.captureEvent("plan-new-map-mode", {
                mapMode,
                trigger: "start-finish-panel",
              });
              setMapMode(true);
            }}
          >
            <GroupWithTitle title="Trip details">
              <AnimatePresence>
                <MotiView
                  from={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 1 }}
                  className="flex h-14 w-full flex-col items-start justify-start p-2"
                >
                  <View className="flex w-full flex-row items-center gap-2">
                    <CirclePlayIcon className="size-4 text-[#FF5937]" />
                    <Text className="w-full truncate text-sm dark:text-gray-200">
                      {isRoundTrip ? "Start/Finish Point: " : "Start: "}
                      {startCoords
                        ? startDesc ||
                          `${startCoords[0].toFixed(4)}, ${startCoords[1].toFixed(4)}`
                        : "Not set"}
                    </Text>
                  </View>
                  {!isRoundTrip && (
                    <View className="flex flex-row items-center gap-2">
                      <CirclePauseIcon className="size-4 text-[#FF5937]" />
                      <Text className="truncate text-sm dark:text-gray-200">
                        Finish:{" "}
                        {finishCoords
                          ? finishDesc ||
                            `${finishCoords[0].toFixed(4)}, ${finishCoords[1].toFixed(4)}`
                          : "Not set"}
                      </Text>
                    </View>
                  )}
                  {isRoundTrip && (
                    <View className="flex flex-row items-center gap-6">
                      <View className="flex flex-row items-center gap-2">
                        <StretchHorizontal className="size-4 text-[#FF5937]" />
                        <Text className="text-sm dark:text-gray-200">
                          Trip: ~{selectedDistance}km
                        </Text>
                      </View>
                      <View className="flex flex-row items-center gap-2">
                        <Compass className="size-4 text-[#FF5937]" />
                        <Text className="text-sm dark:text-gray-200">
                          {getCardinalDirection(bearing || 0)} ({bearing || 0}°)
                        </Text>
                      </View>
                    </View>
                  )}
                </MotiView>
              </AnimatePresence>
            </GroupWithTitle>
          </Pressable>
          <GroupWithTitle title="Trip type">
            <Pressable
              role="button"
              onPress={() => {
                posthogClient.captureEvent("plan-new-round-trip-set", {
                  isRoundTrip,
                });
                setIsRoundTrip(false);
              }}
              className={cn(
                "flex flex-1 flex-row items-center justify-center gap-2 rounded-xl border-2 border-black bg-white px-4 py-2",
                {
                  "border-[#FF5937] bg-[#FF5937]": !isRoundTrip,
                  "border-black bg-white dark:border-gray-700 dark:bg-gray-900":
                    isRoundTrip,
                },
              )}
            >
              <Route className="size-6 text-sm dark:text-gray-200" />
              <Text className="text-sm dark:text-gray-200">
                Start to Finish
              </Text>
            </Pressable>
            <Pressable
              role="button"
              onPress={() => {
                posthogClient.captureEvent("plan-new-round-trip-set", {
                  isRoundTrip,
                });
                setIsRoundTrip(true);
              }}
              className={cn(
                "flex flex-1 flex-row items-center justify-center gap-2 rounded-xl border-2 border-black bg-white px-4 py-2",
                {
                  "border-[#FF5937] bg-[#FF5937]": isRoundTrip,
                  "border-black bg-white dark:border-gray-700 dark:bg-gray-900":
                    !isRoundTrip,
                },
              )}
            >
              <RotateCw className="size-6 text-sm dark:text-gray-200" />
              <Text className="text-sm dark:text-gray-200">Round Trip</Text>
            </Pressable>
          </GroupWithTitle>
          <GroupWithTitle title="Routing rules">
            {(
              ruleSets ||
              Array(3)
                .fill(0)
                .map((_, id) => ({
                  id,
                  isSystem: true,
                  icon: null,
                  name: "...",
                  isDefault: false,
                }))
            )
              .filter((rs) => rs.isSystem)
              .map((rs) => (
                <Pressable
                  role="button"
                  key={rs.id}
                  aria-label={
                    rs.icon === "adv"
                      ? "Adventure"
                      : rs.icon === "touring"
                        ? "Touring"
                        : rs.icon === "dualsport"
                          ? "Dualsport"
                          : undefined
                  }
                  onPress={() => {
                    posthogClient.captureEvent("plan-new-rule-set-selected", {
                      ruleSetId: rs.id,
                      isSystem: rs.isSystem,
                    });
                    if (typeof rs.id === "string") {
                      setRuleSetId(rs.id);
                    }
                  }}
                  className={cn(
                    "flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border-2 px-4 py-2",
                    {
                      "border-[#FF5937] bg-[#FF5937]": rs.id === ruleSetId,
                      "border-black bg-white dark:border-gray-700 dark:bg-gray-900":
                        rs.id !== ruleSetId,
                    },
                  )}
                >
                  {rs.icon === "adv" && (
                    <AdvIcon className="size-12 dark:fill-gray-200" />
                  )}
                  {rs.icon === "touring" && (
                    <TouringIcon className="size-12 dark:fill-gray-200" />
                  )}
                  {rs.icon === "dualsport" && (
                    <DualsportIcon className="size-12 dark:fill-gray-200" />
                  )}
                  {!rs.icon && typeof rs.id === "number" && (
                    <Hourglass className="m-3 size-6 dark:text-gray-200" />
                  )}
                  {!rs.icon && typeof rs.id === "string" && (
                    <Waypoints className="m-3 size-6 dark:text-gray-200" />
                  )}
                </Pressable>
              ))}
            <Pressable
              role="button"
              aria-label="Rule Set Overview"
              onPress={() => {
                router.push({
                  pathname: "/rules",
                  params: {
                    rule: JSON.stringify(ruleSetId),
                  },
                });
              }}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border-2 px-4 py-2",
                {
                  "border-[#FF5937] bg-[#FF5937]":
                    ruleSets?.find((rs) => rs.id === ruleSetId)?.isSystem ===
                    false,
                  "border-black bg-white dark:border-gray-700 dark:bg-gray-900":
                    ruleSets?.find((rs) => rs.id === ruleSetId)?.isSystem ===
                      true ||
                    ruleSets?.find((rs) => rs.id === ruleSetId)?.isSystem ===
                      undefined,
                },
              )}
            >
              <Settings className="size-6 dark:text-gray-200" />
            </Pressable>
          </GroupWithTitle>
          <Pressable
            role="button"
            onPress={() => {
              posthogClient.captureEvent("plan-new-map-mode", {
                mapMode,
                trigger: "map-panel",
              });
              setMapMode(true);
            }}
          >
            <GroupWithTitle title="Overview" className="h-48">
              {!!initialCoords && (
                <GeoMapPlanView
                  bearing={isRoundTrip ? (bearing ?? null) : null}
                  distance={(selectedDistance || 0) * 1000}
                  initialCoords={initialCoords}
                  start={
                    startCoords
                      ? {
                          lat: startCoords[0],
                          lon: startCoords[1],
                        }
                      : null
                  }
                  finish={
                    finishCoords
                      ? { lat: finishCoords[0], lon: finishCoords[1] }
                      : null
                  }
                />
              )}
            </GroupWithTitle>
          </Pressable>
          <AnimatePresence>
            {isRoundTrip && (
              <MotiView
                from={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <GroupWithTitle title="Direction">
                  <View className="flex w-full flex-col gap-2">
                    <View className="flex w-full flex-row justify-between px-2">
                      {DIRECTIONS.concat(["N"]).map((direction, idx) => (
                        <Text
                          key={idx}
                          className={cn(
                            "text-xs font-medium transition-colors",
                            {
                              "text-[#FF5937]":
                                getCardinalDirection(bearing || 0) ===
                                direction,
                              "text-gray-400 dark:text-gray-500":
                                getCardinalDirection(bearing || 0) !==
                                direction,
                            },
                          )}
                        >
                          {direction}
                        </Text>
                      ))}
                    </View>
                    <View className="relative h-12 w-full">
                      <View className="absolute inset-0 flex flex-row items-center">
                        <View className="h-2 w-full rounded-lg bg-gray-200 dark:bg-gray-700" />
                      </View>
                      <Slider
                        {...{ id: "bearing-slider" }}
                        renderThumbComponent={() => (
                          <View className="size-12 rounded-lg border-2 border-[#FF5937] bg-[#FF5937]" />
                        )}
                        trackClickable={true}
                        step={1}
                        value={bearing}
                        maximumValue={359}
                        minimumValue={0}
                        trackStyle={{ backgroundColor: "transparent" }}
                        minimumTrackStyle={{ backgroundColor: "transparent" }}
                        maximumTrackStyle={{ backgroundColor: "transparent" }}
                        onValueChange={(value) => {
                          posthogClient.captureEvent("plan-new-bearing-set", {
                            bearing,
                          });
                          setBearing(value[0]);
                        }}
                      />
                    </View>
                  </View>
                </GroupWithTitle>
                <GroupWithTitle title="Distance">
                  <View className="flex w-full flex-col gap-2">
                    <View className="flex w-full flex-row justify-between px-1">
                      {DISTANCES.map((distance) => (
                        <Text
                          key={distance}
                          className={`text-xs font-medium transition-colors ${
                            selectedDistance === distance
                              ? "text-[#FF5937]"
                              : "text-gray-400 dark:text-gray-500"
                          }`}
                        >
                          {distance}km
                        </Text>
                      ))}
                    </View>
                    <View className="relative h-12 w-full">
                      <View className="absolute inset-0 flex flex-row items-center">
                        <View className="h-2 w-full rounded-lg bg-gray-200 dark:bg-gray-700" />
                      </View>
                      <Slider
                        {...{ id: "distance-slider" }}
                        renderThumbComponent={() => (
                          <View className="size-12 rounded-lg border-2 border-[#FF5937] bg-[#FF5937]" />
                        )}
                        trackClickable={true}
                        step={1}
                        value={DISTANCES.indexOf(selectedDistance || 100)}
                        maximumValue={DISTANCES.length - 1}
                        trackStyle={{ backgroundColor: "transparent" }}
                        minimumTrackStyle={{ backgroundColor: "transparent" }}
                        maximumTrackStyle={{ backgroundColor: "transparent" }}
                        onValueChange={(value) => {
                          posthogClient.captureEvent("plan-new-distance-set", {
                            selectedDistance,
                          });
                          const distIdx = value[0] || 0;
                          setSelectedDistance(DISTANCES[distIdx]);
                        }}
                      />
                    </View>
                  </View>
                </GroupWithTitle>
              </MotiView>
            )}
          </AnimatePresence>
        </ScrollView>
      </View>
    </ScreenFrame>
  );
}
