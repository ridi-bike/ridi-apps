import { Stack } from "expo-router";
import { MapPin, Navigation } from "lucide-react-native";
import { View, Text, ScrollView } from "react-native";

import { RouteCard } from "~/components/route-card";
import { ScreenHeader } from "~/components/screen-header";

export default function PlanDetails() {
  const plan = {
    startAddress: "123 Main St, San Francisco, CA",
    endAddress: "456 Market St, San Francisco, CA",
    distance: "3.2 miles",
    startCoords: [37.7749, -122.4194] as [number, number],
    finishCoords: [37.7937, -122.3965] as [number, number],
    routes: [
      {
        id: 1,
        distance: "3.2 miles",
        startCoords: [37.7749, -122.4194] as [number, number],
        finishCoords: [37.7937, -122.3965] as [number, number],
        roadTypes: {
          paved: 70,
          gravel: 20,
          trail: 10,
        },
        score: 85,
      },
      {
        id: 2,
        distance: "3.5 miles",
        startCoords: [37.7749, -122.4194] as [number, number],
        finishCoords: [37.7937, -122.3965] as [number, number],
        roadTypes: {
          paved: 90,
          gravel: 10,
          trail: 0,
        },
        score: 75,
      },
      {
        id: 3,
        distance: "3.8 miles",
        startCoords: [37.7749, -122.4194] as [number, number],
        finishCoords: [37.7937, -122.3965] as [number, number],
        roadTypes: {
          paved: 60,
          gravel: 30,
          trail: 10,
        },
        score: 92,
      },
    ],
  };

  return (
    <ScrollView className="min-h-screen w-full bg-white dark:bg-gray-900">
      <View
        role="main"
        className="flex flex-row justify-center px-6 pb-24 pt-8 md:px-8"
      >
        <Stack.Screen
          options={{
            header: (props) => (
              <ScreenHeader headerProps={props} title="Plan routes" />
            ),
          }}
        />
        <View className="mx-2 max-w-3xl flex-1">
          <View className="mb-8 rounded-2xl border-2 border-black bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800">
            <View className="space-y-4">
              <View className="flex flex-row items-start gap-3">
                <MapPin className="mt-1 size-6 text-[#FF5937]" />
                <View>
                  <Text className="text-sm font-bold text-[#FF5937]">
                    Start
                  </Text>
                  <Text className="text-base font-medium dark:text-gray-200">
                    {plan.startAddress}
                  </Text>
                </View>
              </View>
              <View className="flex flex-row items-start gap-3">
                <Navigation className="mt-1 size-6 text-[#FF5937]" />
                <View>
                  <Text className="text-sm font-bold text-[#FF5937]">End</Text>
                  <Text className="text-base font-medium dark:text-gray-200">
                    {plan.endAddress}
                  </Text>
                </View>
              </View>
              <View className="border-t-2 border-black pt-4 text-base dark:border-gray-700">
                <Text className="font-bold dark:text-gray-100">
                  Total distance:{" "}
                </Text>
                <Text className="font-medium dark:text-gray-200">
                  {plan.distance}
                </Text>
              </View>
            </View>
          </View>
          <Text
            role="heading"
            aria-level={2}
            className="mb-6 text-2xl font-bold dark:text-gray-100"
          >
            Available Routes
          </Text>
          <View className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {plan.routes.map((route) => (
              <RouteCard key={route.id} route={route} />
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
