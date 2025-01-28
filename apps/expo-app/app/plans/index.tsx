import { Link, Stack } from "expo-router";
import { Plus, UserCircle } from "lucide-react-native";
import { View, Text, Pressable, ScrollView } from "react-native";

import { RouteCard } from "~/components/plan-card";

export default function PlansPage() {
  const routes = [
    {
      startAddress: "123 Main St, San Francisco, CA",
      endAddress: "456 Market St, San Francisco, CA",
      distance: "3.2 miles",
      startCoords: [37.7749, -122.4194],
      finishCoords: [37.7937, -122.3965],
    },
    {
      startAddress: "789 Mission St, San Francisco, CA",
      endAddress: "321 Howard St, San Francisco, CA",
      distance: "2.8 miles",
      startCoords: [37.7855, -122.4071],
      finishCoords: [37.7897, -122.3947],
    },
  ];

  return (
    <>
      <ScrollView className="min-h-screen w-full bg-white dark:bg-gray-900">
        <Stack.Screen
          options={{
            header: () => (
              <View className="mx-auto flex h-16 w-full flex-row items-center justify-between border-b border-gray-200 bg-white px-6 md:px-8 dark:border-gray-700 dark:bg-gray-900">
                <Text
                  role="heading"
                  aria-level={1}
                  className="text-2xl font-bold tracking-tight text-[#FF5937]"
                >
                  Ridi plans
                </Text>
                <Link
                  role="button"
                  className="flex size-10 items-center justify-center text-gray-600 transition-colors hover:text-[#FF5937] dark:text-gray-400"
                  aria-label="Profile"
                  href="/settings"
                >
                  <UserCircle className="size-8" />
                </Link>
              </View>
            ),
          }}
        />
        <View
          role="main"
          className="flex flex-row justify-center px-6 pb-24 pt-8 md:px-8"
        >
          <View className="mx-2 max-w-3xl flex-1">
            <View className="space-y-6">
              {routes.map((route, index) => (
                <RouteCard key={index} {...route} />
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
      <Link
        role="button"
        className="fixed bottom-8 right-8 flex size-24 items-center justify-center rounded-full bg-[#FF5937] shadow-lg transition-colors hover:bg-[#ff4a25]"
        aria-label="Create new plan"
        href="/plans/new"
      >
        <Plus className="size-12 text-white dark:text-gray-900" />
      </Link>
    </>
  );
}
