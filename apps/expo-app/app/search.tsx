import { coordsAddressCacheInsert } from "@ridi/maps-api";
import { useRootNavigationState, useRouter } from "expo-router";
import {
  Search,
  MapPin,
  Map as MapIcon,
  Pin,
  Hourglass,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";

import { GeoMapStatic } from "~/components/geo-map/geo-map-static";
import { PointSelectDialog } from "~/components/point-select-dialog";
import { ScreenCard } from "~/components/screen-card";
import { ScreenFrame } from "~/components/screen-frame";
import { cn } from "~/lib/utils";

type Location = {
  display_name: string;
  lat: string;
  lon: string;
};

type LocationCardProps = {
  location: Location;
  gotoNewScreen: () => void;
};

function LocationCard({ location, gotoNewScreen }: LocationCardProps) {
  const router = useRouter();
  return (
    <PointSelectDialog
      title="Select"
      description={location.display_name}
      lat={parseFloat(location.lat)}
      lon={parseFloat(location.lon)}
      setStart={() => {
        gotoNewScreen();
        router.setParams({
          start: JSON.stringify([
            parseFloat(location.lat),
            parseFloat(location.lon),
          ]),
        });
      }}
      setFinish={() => {
        gotoNewScreen();
        router.setParams({
          finish: JSON.stringify([
            parseFloat(location.lat),
            parseFloat(location.lon),
          ]),
        });
      }}
    >
      <ScreenCard
        topClassName="h-40"
        top={
          <GeoMapStatic
            points={[
              {
                icon: <Pin className="size-6" />,
                coords: {
                  lat: parseFloat(location.lat),
                  lon: parseFloat(location.lon),
                },
              },
            ]}
          />
        }
        middle={
          <View className="flex-row items-center gap-2">
            <MapPin className="size-4 shrink-0 text-[#FF5937]" />
            <Text
              className="text-sm text-black dark:text-gray-200"
              numberOfLines={1}
            >
              {location.display_name}
            </Text>
          </View>
        }
      />
    </PointSelectDialog>
  );
}

export default function LocationSearch() {
  const router = useRouter();
  const navState = useRootNavigationState();
  const [searchQuery, setSearchQuery] = useState("");
  const [locations, setLocations] = useState<Location[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    setSearching(true);
    if (!searchQuery.trim()) return;
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`,
      );
      const data = await response.json();

      (data as Location[]).forEach((loc) =>
        coordsAddressCacheInsert([loc.lat, loc.lon], loc.display_name),
      );
      setLocations(data);
      setSearching(false);
    } catch (error) {
      console.error("Search error:", error);
    }
  };

  const gotoNewScreen = useCallback(() => {
    if (navState.routes[(navState.index || 0) - 1]?.name === "plans/new") {
      router.back(); // TODO not quite working, seems to be replacing
    } else {
      router.replace("/plans/new");
    }
  }, [navState.index, navState.routes, router]);

  return (
    <ScreenFrame
      title="Search"
      floating={
        <View className="absolute inset-x-0 bottom-0 border-t-2 border-black bg-white dark:border-gray-700 dark:bg-gray-900">
          <View className="p-4">
            <Pressable
              onPress={() => {
                gotoNewScreen();
                router.setParams({
                  "search-results": JSON.stringify(
                    locations.map((l) => [
                      parseFloat(l.lat),
                      parseFloat(l.lon),
                    ]),
                  ),
                });
              }}
              disabled={locations.length === 0}
              className="mb-4 w-full flex-row items-center justify-center gap-2 rounded-xl border-2 border-black bg-white px-4 py-3 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900"
            >
              <MapIcon className="size-4 dark:text-gray-200" />
              <Text className="text-sm font-medium text-black dark:text-gray-200">
                Show all on map
              </Text>
            </Pressable>
            <View className="flex-row gap-2">
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search location..."
                className="flex-1 rounded-xl border-2 border-black bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              />
              <Pressable
                onPress={handleSearch}
                className={cn(
                  "flex-row items-center justify-center rounded-xl bg-[#FF5937] px-6 py-3",
                  {
                    "bg-[#FF5937]/70": searching,
                  },
                )}
                disabled={searching}
              >
                {!searching && <Search className="size-5 text-white" />}
                {searching && <Hourglass className="size-5 text-white" />}
              </Pressable>
            </View>
          </View>
        </View>
      }
    >
      <View className="mx-2 max-w-5xl flex-1">
        <View className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {locations.length > 0 ? (
            <>
              {locations.map((location, index) => (
                <LocationCard
                  key={index}
                  location={location}
                  gotoNewScreen={gotoNewScreen}
                />
              ))}
            </>
          ) : (
            <Text className="p-4 text-center text-gray-500 dark:text-gray-200">
              Search for a location to see results
            </Text>
          )}
        </View>
      </View>
    </ScreenFrame>
  );
}
