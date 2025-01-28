import { Link } from "expo-router";
import { MapPin, Navigation } from "lucide-react-native";
import { View, Text } from "react-native";

import { RouteCard } from "~/components/route-card";
import { ScreenCard } from "~/components/screen-card";
import { ScreenFrame } from "~/components/screen-frame";

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
    <ScreenFrame title="Plan routes">
      <View className="mx-2 max-w-3xl flex-1">
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
                      {plan.startAddress}
                    </Text>
                  </View>
                </View>
                <View className="flex flex-row items-start gap-3">
                  <Navigation className="mt-1 size-6 text-[#FF5937]" />
                  <View>
                    <Text className="text-sm font-bold text-[#FF5937]">
                      End
                    </Text>
                    <Text className="text-base font-medium dark:text-gray-200">
                      {plan.endAddress}
                    </Text>
                  </View>
                </View>
              </View>
            </>
          }
          bottom={
            <>
              <Text className="font-bold dark:text-gray-100">
                Total distance:{" "}
              </Text>
              <Text className="font-medium dark:text-gray-200">
                {plan.distance}
              </Text>
            </>
          }
        />
        <Text
          role="heading"
          aria-level={2}
          className="my-6 text-2xl font-bold dark:text-gray-100"
        >
          Available Routes
        </Text>
        <View className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {plan.routes.map((route) => (
            <Link key={route.id} href="/plans/1/1">
              <RouteCard route={route} />
            </Link>
          ))}
        </View>
      </View>
    </ScreenFrame>
  );
}
