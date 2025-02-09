import { Slider } from "@miblanchard/react-native-slider";
import * as turf from "@turf/turf";
import * as Location from "expo-location";
import { Link, useRouter } from "expo-router";
import {
  Compass,
  Crosshair,
  Locate,
  MapPin,
  MapPinned,
  Navigation,
  Route,
  Search,
  StretchHorizontal,
} from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import * as z from "zod";

import { GeoMapCoordsSelector } from "~/components/geo-map/geo-map-coords-selector";
import { DIRECTIONS, getCardinalDirection } from "~/components/geo-map/util";
import { LocationPermsNotGiven } from "~/components/LocationPermsNotGiven";
import { ScreenFrame } from "~/components/screen-frame";
import { useStorePlans } from "~/lib/stores/plans-store";
import { useStoreRuleSets } from "~/lib/stores/rules-store";
import { useUrlParams } from "~/lib/url-params";
import { cn } from "~/lib/utils";

const DISTANCES = [100, 150, 200, 250, 300, 350];

const coordsSchema = z.tuple([z.number(), z.number()]);
type Coords = z.infer<typeof coordsSchema>;

export default function PlansNew() {
  const router = useRouter();
  const { planAdd } = useStorePlans();
  const [startCoords, setStartCoords] = useUrlParams("start", coordsSchema);
  const [finishCoords, setFinishCoords] = useUrlParams("finish", coordsSchema);
  const [isRoundTrip, setIsRoundTrip] = useUrlParams("round-trip", z.boolean());
  const [selectedDistance, setSelectedDistance] = useUrlParams(
    "distance",
    z.number(),
  );
  const [bearing, setBearing] = useUrlParams("bearing", z.number());
  const [findCoords, setFindCoords] = useState(false);
  const [searchPoints, setSearchPoints] = useUrlParams(
    "search-results",
    z.array(coordsSchema),
  );

  const [showLocationAlert, setShowLocationAlert] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<Coords | null>(null);

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
            ruleSets.find((rp) => !rp.isSystem)?.id || ruleSets[0].id,
          ),
        0,
      );
    }
  }, [ruleSetId, ruleSets, setRuleSetId]);

  const getCurrentLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setShowLocationAlert(true);
      return;
    }

    const location = await Location.getCurrentPositionAsync({});

    if (location) {
      setCurrentCoords([location.coords.latitude, location.coords.longitude]);
    }
  }, []);

  function canCreateRoute(): boolean {
    return (
      (isRoundTrip && !!startCoords) ||
      (!isRoundTrip && !!startCoords && !!finishCoords)
    );
  }

  return (
    <ScreenFrame
      title="New plan"
      floating={
        <View className="fixed bottom-0 w-full bg-white p-4 dark:bg-gray-800">
          <Pressable
            onPress={() => {
              if (
                (!isRoundTrip && startCoords && finishCoords && ruleSetId) ||
                (isRoundTrip &&
                  startCoords &&
                  bearing !== undefined &&
                  selectedDistance &&
                  ruleSetId)
              ) {
                let distance = (selectedDistance || 0) * 1000;
                if (!isRoundTrip && finishCoords) {
                  const turfP1 = turf.point([startCoords[1], startCoords[0]]);
                  const turfP2 = turf.point([finishCoords[1], finishCoords[0]]);
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
        </View>
      }
    >
      {showLocationAlert && (
        <LocationPermsNotGiven
          close={() => {
            setShowLocationAlert(false);
          }}
        />
      )}
      <View className="max-w-3xl flex-1 p-4 pb-24">
        <View className="mb-4 rounded-xl border-2 border-black p-4 dark:border-gray-700">
          <View className="flex flex-row items-center justify-between">
            <View className="flex-1 space-y-2">
              <View className="flex flex-row items-center gap-2">
                <MapPin className="size-4 text-[#FF5937]" />
                <Text className="text-sm dark:text-gray-200">
                  {isRoundTrip ? "Start/Finish Point: " : "Start: "}
                  {startCoords
                    ? `${startCoords[0].toFixed(4)}, ${startCoords[1].toFixed(
                        4,
                      )}`
                    : "Not set"}
                </Text>
              </View>
              {!isRoundTrip && (
                <View className="flex flex-row items-center gap-2">
                  <Crosshair className="size-4 text-[#FF5937]" />
                  <Text className="text-sm dark:text-gray-200">
                    Finish:{" "}
                    {finishCoords
                      ? `${finishCoords[0].toFixed(4)}, ${finishCoords[1].toFixed(4)}`
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
            </View>
            <Pressable
              onPress={() => {
                setIsRoundTrip(!isRoundTrip);
              }}
              className={cn(
                "flex flex-row items-center justify-center gap-2 rounded-xl border-2 px-4 py-2 transition-colors ",
                {
                  "border-[#FF5937] bg-[#FF5937]": !isRoundTrip,
                  "border-black bg-white dark:border-gray-700 dark:bg-gray-900":
                    isRoundTrip,
                },
              )}
            >
              <Route
                className={cn("size-8", {
                  "dark:text-gray-400": isRoundTrip,
                  "dark:text-gray-800": !isRoundTrip,
                })}
              />
            </Pressable>
          </View>
        </View>
        <View className="mb-4 flex flex-row gap-2">
          <Pressable
            onPress={() => {
              router.navigate("/rules");
              router.setParams({
                "selected-rule-id": JSON.stringify(ruleSetId),
              });
            }}
            className="flex flex-1 flex-row items-center justify-center gap-2 rounded-xl border-2 border-black bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-900"
          >
            <Navigation className="size-4 dark:text-gray-200" />
            <Text className="text-sm dark:text-gray-200">
              Routing rules:{" "}
              {ruleSets.find((rp) => rp.id === ruleSetId)?.name || "..."}
            </Text>
          </Pressable>
        </View>
        <View className="h-[400px] w-full overflow-hidden rounded-xl border-2 border-black dark:border-gray-700">
          <GeoMapCoordsSelector
            isRoundTrip={isRoundTrip || false}
            start={
              startCoords ? { lat: startCoords[0], lon: startCoords[1] } : null
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
              title: "omg",
              description: "omgomg",
              coords: { lat: c[0], lon: c[1] },
            }))}
            findCoords={findCoords}
            setStart={(c) => setStartCoords(c ? [c.lat, c.lon] : undefined)}
            setFinish={(c) => setFinishCoords(c ? [c.lat, c.lon] : undefined)}
            bearing={bearing}
            distance={selectedDistance}
          />
        </View>
        <View className="my-4 flex flex-row gap-2">
          <Pressable
            onPress={getCurrentLocation}
            className="flex flex-1 flex-row items-center justify-center gap-2 rounded-xl border-2 border-black bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-900"
          >
            <Locate className="size-4 dark:text-gray-200" />
            <Text className="text-sm dark:text-gray-200">Me</Text>
          </Pressable>
          <Pressable
            onPress={() => setFindCoords((v) => !v)}
            className={cn(
              "flex flex-1 flex-row items-center justify-center gap-2 rounded-xl border-2 px-4 py-2",
              {
                "border-[#FF5937] bg-[#FF5937] text-white": findCoords,
                "border-black bg-white dark:border-gray-700 dark:bg-gray-900":
                  !findCoords,
              },
            )}
          >
            <MapPinned className="size-4 dark:text-gray-200" />
            <Text className="text-sm dark:text-gray-200">Point on map</Text>
          </Pressable>
          {!searchPoints && (
            <Link
              href="/search"
              className="flex flex-1 flex-row items-center justify-center gap-2 rounded-xl border-2 border-black bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-900"
            >
              <Search className="size-4 dark:text-gray-200" />
              <Text className="text-sm dark:text-gray-200">Search</Text>
            </Link>
          )}
          {searchPoints?.length && (
            <Pressable
              onPress={() => {
                setSearchPoints();
              }}
              className="flex flex-1 flex-row items-center justify-center gap-2 rounded-xl border-2 border-[#FF5937] bg-[#FF5937] px-4 py-2 text-white"
            >
              <Search className="size-4 dark:text-gray-200" />
              <Text className="text-sm dark:text-gray-200">Search</Text>
            </Pressable>
          )}
        </View>
        <View className="space-y-4">
          {isRoundTrip && (
            <>
              <View className="space-y-4 rounded-xl border-2 border-black p-4 dark:border-gray-700">
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
              <View className="space-y-4 rounded-xl border-2 border-black p-4 dark:border-gray-700">
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
            </>
          )}
        </View>
      </View>
    </ScreenFrame>
  );
}
