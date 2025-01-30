import { Slider } from "@miblanchard/react-native-slider";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import {
  Compass,
  Crosshair,
  MapPin,
  Navigation,
  Route,
  Search,
  StretchHorizontal,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { GeoMapCoordsSelector } from "~/components/geo-map/geo-map-coords-selector";
import { LocationPermsNotGiven } from "~/components/LocationPermsNotGiven";
import { ScreenFrame } from "~/components/screen-frame";
import { useStorePlans } from "~/lib/stores/plans-store";
import { cn } from "~/lib/utils";

const DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const DISTANCES = [100, 150, 200, 250, 300, 350];

type Coords = {
  lat: number;
  lon: number;
};


export default function PlansNew() {
  const router = useRouter()
  const { planAdd } = useStorePlans()
  const [startCoords, setStartCoords] = useState<Coords | null>(null);
  const [finishCoords, setFinishCoords] = useState<Coords | null>(null);
  const [isRoundTrip, setIsRoundTrip] = useState(true);
  const [selectedDistance, setSelectedDistance] = useState(200);
  const [bearing, setBearing] = useState(0);
  const [findCoords, setFindCoords] = useState(false)
  const [searchPoints, setSearchPoints] = useState([])

  const [showLocationAlert, setShowLocationAlert] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<Coords | null>(null);


  const getCardinalDirection = (degrees: number): string => {
    const index = Math.round(degrees / 45) % 8;
    return DIRECTIONS[index];
  };
  const getCurrentLocation = useCallback(async () => {
    const { status } =
      await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setShowLocationAlert(true);
      return;
    }

    const location = await Location.getCurrentPositionAsync({});

    if (location) {
      setCurrentCoords({
        lat: location.coords.latitude,
        lon: location.coords.longitude,
      });
    }
  }, [])


  function canCreateRoute(): boolean {
    return (isRoundTrip && !!startCoords) || (!isRoundTrip && !!startCoords && !!finishCoords)
  }

  return (
    <ScreenFrame
      title="New plan"
      floating={
        <View className="fixed bottom-0 w-full bg-white/50 p-4 dark:bg-gray-800/50">
          <Pressable
            onPress={() => {
              if (startCoords && finishCoords) {
                const planId = planAdd({
                  fromLat: startCoords.lat,
                  fromLon: startCoords.lon,
                  toLat: finishCoords.lat,
                  toLon: finishCoords.lon,
                });
                router.replace({
                  pathname: "/plans/[planId]",
                  params: { planId },
                });
              }
            }}
            aria-disabled={!canCreateRoute()}
            className={cn(
              "w-full rounded-xl px-4 py-3 mb-24 font-medium text-white transition-colors",
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
                    ? `${startCoords.lat.toFixed(4)}, ${startCoords.lon.toFixed(4)
                    }`
                    : "Not set"}
                </Text>
              </View>
              {!isRoundTrip && (
                <View className="flex flex-row items-center gap-2">
                  <Crosshair className="size-4 text-[#FF5937]" />
                  <Text className="text-sm dark:text-gray-200">
                    Finish: {finishCoords
                      ? `${finishCoords.lat.toFixed(4)}, ${finishCoords.lon.toFixed(4)}`
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
                      {getCardinalDirection(bearing)} ({bearing}°)
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
              <Route className={cn("size-8", { "dark:text-gray-400": isRoundTrip, "dark:text-gray-800": !isRoundTrip })} />
            </Pressable>
          </View>
        </View>
        <View className="h-[400px] w-full overflow-hidden rounded-xl border-2 border-black dark:border-gray-700">
          <GeoMapCoordsSelector
            isRoundTrip={isRoundTrip}
            start={startCoords}
            finish={finishCoords}
            current={currentCoords}
            points={searchPoints}
            findCoords={findCoords}
            setStart={setStartCoords}
            setFinish={setFinishCoords}
          />
        </View>
        <View className="my-4 flex flex-row gap-2">
          <Pressable
            onPress={getCurrentLocation}
            className="flex flex-1 flex-row items-center justify-center gap-2 rounded-xl border-2 border-black bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-900"
          >
            <Navigation className="size-4" />
            <Text className="text-sm dark:text-gray-200">My Location</Text>
          </Pressable>
          <Pressable
            onPress={() => setFindCoords(v => !v)}
            className={cn(
              "flex flex-1 flex-row items-center justify-center gap-2 rounded-xl border-2 px-4 py-2",
              {
                "border-[#FF5937] bg-[#FF5937] text-white": findCoords,
                "border-black bg-white dark:border-gray-700 dark:bg-gray-900":
                  !findCoords,
              },
            )}
          >
            <MapPin className="size-4" />
            <Text className="text-sm dark:text-gray-200">Map Location</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              console.log("Navigate to search screen");
            }}
            className="flex flex-1 flex-row items-center justify-center gap-2 rounded-xl border-2 border-black bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-900"
          >
            <Search className="size-4" />
            <Text className="text-sm dark:text-gray-200">Search</Text>
          </Pressable>
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
                        "text-[#FF5937]": getCardinalDirection(bearing) === direction,
                        "text-gray-400 dark:text-gray-500": getCardinalDirection((bearing)) !== direction
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
                    renderThumbComponent={() => <View className="size-12 rounded-lg border-2 border-[#FF5937] bg-[#FF5937]" />}

                    trackClickable={true}
                    step={1}
                    value={bearing}
                    maximumValue={359}
                    minimumValue={0}
                    trackStyle={{ backgroundColor: 'transparent' }}
                    onValueChange={(value) => {
                      setBearing(value[0])
                    }}
                  />
                </View>
              </View>
              <View className="space-y-4 rounded-xl border-2 border-black p-4 dark:border-gray-700">
                <View className="flex w-full flex-row justify-between px-1">
                  {DISTANCES.map((distance) => (
                    <Text
                      key={distance}
                      className={`text-xs font-medium transition-colors ${selectedDistance === distance
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
                    renderThumbComponent={() => <View className="size-12 rounded-lg border-2 border-[#FF5937] bg-[#FF5937]" />}
                    trackClickable={true}
                    step={1}
                    value={DISTANCES.indexOf(selectedDistance)}
                    maximumValue={DISTANCES.length - 1}
                    trackStyle={{ backgroundColor: 'transparent' }}
                    onValueChange={(value) => {
                      console.log({ value });
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
