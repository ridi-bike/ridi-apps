import { Slider } from "@miblanchard/react-native-slider";
import { coordsAddressGet } from "@ridi/maps-api";
import * as turf from "@turf/turf";
import * as Location from "expo-location";
import { Link, useRouter } from "expo-router";
import {
  CirclePauseIcon,
  CirclePlayIcon,
  Compass,
  Locate,
  MapPinned,
  RotateCw,
  Route,
  Search,
  Settings,
  StretchHorizontal,
  Waypoints,
} from "lucide-react-native";
import { AnimatePresence, MotiView, ScrollView } from "moti";
import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import * as z from "zod";

import { GeoMapCoordsSelector } from "~/components/geo-map/geo-map-coords-selector";
import { GeoMapPlanView } from "~/components/geo-map/geo-map-plan-view";
import { DIRECTIONS, getCardinalDirection } from "~/components/geo-map/util";
import { LocationPermsNotGiven } from "~/components/LocationPermsNotGiven";
import { ScreenFrame } from "~/components/screen-frame";
import { findRegions, type Region } from "~/lib/regions";
import { useStorePlans } from "~/lib/stores/plans-store";
import { useStoreRuleSets } from "~/lib/stores/rules-store";
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

export default function PlansNew() {
  const router = useRouter();
  const { planAdd } = useStorePlans();
  const [startCoords, setStartCoords] = useUrlParams("start", coordsSchema);
  const [finishCoords, setFinishCoords] = useUrlParams("finish", coordsSchema);
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
      setStartRegions(null);
    }
  }, [finishCoords]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  useEffect(() => {
    if (startCoords && finishCoords && startRegions && finishRegions) {
      if (!startRegions.length || !finishRegions.length) {
        setErrorMessage("Journey start or finish set in unsupported region");
      } else {
        const overlapping = startRegions.filter((sr) =>
          finishRegions.find((fr) => fr.region === sr.region),
        );
        if (!overlapping.length) {
          setErrorMessage("Journey start and finish are in different regions");
        } else {
          setErrorMessage(null);
        }
      }
    }
  }, [finishCoords, finishRegions, startCoords, startRegions]);

  useEffect(() => {
    // set immediate is needed to let the stack mount first and then update params
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
  const { data: ruleSets } = useStoreRuleSets();
  useEffect(() => {
    if (!ruleSetId && ruleSets?.length) {
      setTimeout(
        () =>
          setRuleSetId(
            ruleSets.find((rp) => !rp.isSystem)?.id ||
              ruleSets.find((rp) => rp.isDefault)?.id ||
              ruleSets[0].id,
          ),
        0,
      );
    }
  }, [ruleSetId, ruleSets, setRuleSetId]);

  useEffect(() => {
    if (startCoords) {
      coordsAddressGet([
        startCoords[0].toString(),
        startCoords[1].toString(),
      ]).then((v) => setStartDesc(v));
    }
  }, [startCoords]);

  useEffect(() => {
    if (finishCoords) {
      coordsAddressGet([
        finishCoords[0].toString(),
        finishCoords[1].toString(),
      ]).then((v) => setFinishDesc(v));
    }
  }, [finishCoords]);

  const getCurrentLocation = useCallback(async () => {
    if (currentCoords) {
      setCurrentCoords(null);
      return;
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setShowLocationAlert(true);
      return;
    }

    const location = await Location.getCurrentPositionAsync({});

    if (location) {
      setCurrentCoords([location.coords.latitude, location.coords.longitude]);
    }
  }, [currentCoords]);

  const canCreateRoute = useCallback(() => {
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

  return (
    <ScreenFrame
      title="New plan"
      onGoBack={mapMode ? () => setMapMode(false) : undefined}
      floating={
        <View className="fixed bottom-0 w-full bg-white p-4 dark:bg-gray-800">
          <AnimatePresence>
            {!!errorMessage && (
              <MotiView
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
              onPress={() => setMapMode(false)}
              aria-disabled={!canCreateRoute()}
              className={cn(
                "w-full rounded-xl px-4 py-3 font-medium text-white transition-colors",
                {
                  "bg-[#FF5937] hover:bg-[#FF5937]/90": mapMode,
                  "cursor-not-allowed bg-gray-200 dark:bg-gray-700": !mapMode,
                },
              )}
            >
              <Text className="text-center text-white">Close map</Text>
            </Pressable>
          )}
          {!mapMode && (
            <Pressable
              onPress={() => {
                if (canCreateRoute()) {
                  if (!startCoords || !ruleSetId) {
                    return;
                  }
                  let distance = (selectedDistance || 0) * 1000;
                  if (!isRoundTrip && finishCoords) {
                    const turfP1 = turf.point([startCoords[1], startCoords[0]]);
                    const turfP2 = turf.point([
                      finishCoords[1],
                      finishCoords[0],
                    ]);
                    distance = turf.distance(turfP1, turfP2, {
                      units: "meters",
                    });
                  }
                  const planId = planAdd({
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
              aria-disabled={!canCreateRoute()}
              className={cn(
                "w-full rounded-xl px-4 py-3 font-medium text-white transition-colors",
                {
                  "bg-[#FF5937] hover:bg-[#FF5937]/90": canCreateRoute(),
                  "cursor-not-allowed bg-gray-200 dark:bg-gray-700":
                    !canCreateRoute(),
                },
              )}
            >
              <Text className="text-center text-white">OK</Text>
            </Pressable>
          )}
        </View>
      }
    >
      <AnimatePresence>
        {mapMode && (
          <MotiView
            id="omg"
            className="fixed top-0 z-50 mt-16 w-full bg-white p-4 pb-40 dark:bg-gray-900"
            from={{ height: "0%" }}
            animate={{ height: "100%" }}
            exit={{ height: "0%" }}
            transition={{ type: "timing" }}
          >
            <GeoMapCoordsSelector
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
              setStart={(c) => setStartCoords(c ? [c.lat, c.lon] : undefined)}
              setFinish={(c) => setFinishCoords(c ? [c.lat, c.lon] : undefined)}
              bearing={bearing}
              distance={selectedDistance}
            >
              <View className="flex flex-col items-end justify-start gap-2 p-4">
                <Pressable
                  onPress={getCurrentLocation}
                  className={cn(
                    "flex flex-1 flex-row items-center justify-start gap-2 rounded-xl border-2 p-4",

                    {
                      "border-[#FF5937] bg-[#FF5937] text-white": currentCoords,
                      "border-black bg-white dark:border-gray-700 dark:bg-gray-900":
                        !currentCoords,
                    },
                  )}
                >
                  <Locate className="size-4 dark:text-gray-200" />
                </Pressable>
                <Pressable
                  onPress={() => setCenterSelectionMode(!centerSelectionMode)}
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
                {!searchPoints && (
                  <Link
                    href="/search"
                    className="flex flex-1 flex-row items-center justify-start gap-2 rounded-xl border-2 border-black bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
                  >
                    <Search className="size-4 dark:text-gray-200" />
                  </Link>
                )}
                {searchPoints?.length && (
                  <Pressable
                    onPress={() => {
                      setSearchPoints();
                    }}
                    className="flex flex-1 flex-row items-center justify-start gap-2 rounded-xl border-2 border-[#FF5937] bg-[#FF5937] p-4 text-white"
                  >
                    <Search className="size-4 dark:text-gray-200" />
                  </Pressable>
                )}
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
      <ScrollView className="max-h-[calc(100vh-170px)] max-w-3xl flex-1 px-4 pt-4">
        <Pressable onPress={() => setMapMode(true)}>
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
                    <Text className="overflow-hidden text-ellipsis text-nowrap text-sm dark:text-gray-200">
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
            onPress={() => {
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
            <Text className="text-sm dark:text-gray-200">Start to Finish</Text>
          </Pressable>
          <Pressable
            onPress={() => {
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
            Array(3).map((_, id) => ({
              id,
              isSystem: true,
              name: "...",
              isDefault: false,
            }))
          )
            .filter((rs) => rs.isSystem)
            .map((rs) => (
              <Pressable
                key={rs.id}
                onPress={() => {
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
                <Waypoints className="size-4 dark:text-gray-200" />
                <Text className="text-center text-sm dark:text-gray-200">
                  {rs.name}
                </Text>
              </Pressable>
            ))}
          <Pressable
            onPress={() => {
              router.navigate("/rules");
              router.setParams({
                "selected-rule-id": JSON.stringify(ruleSetId),
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
            <Settings className="size-4 dark:text-gray-200" />
            <Text className="text-sm dark:text-gray-200">Custom</Text>
          </Pressable>
        </GroupWithTitle>
        <Pressable onPress={() => setMapMode(true)}>
          <GroupWithTitle title="Overview" className="h-48">
            <GeoMapPlanView
              bearing={isRoundTrip ? (bearing ?? null) : null}
              distance={selectedDistance || 0}
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
                        className={cn("text-xs font-medium transition-colors", {
                          "text-[#FF5937]":
                            getCardinalDirection(bearing || 0) === direction,
                          "text-gray-400 dark:text-gray-500":
                            getCardinalDirection(bearing || 0) !== direction,
                        })}
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
                        setSelectedDistance(DISTANCES[value[0]]);
                      }}
                    />
                  </View>
                </View>
              </GroupWithTitle>
            </MotiView>
          )}
        </AnimatePresence>
      </ScrollView>
    </ScreenFrame>
  );
}
