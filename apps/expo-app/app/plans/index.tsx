import { View, Text, Pressable, ScrollView } from "react-native";
import { RouteCard } from "~/components/plan-card";
import { Plus, UserCircle } from "lucide-react-native";
import { Link, Stack } from "expo-router";

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
        <Stack.Screen options={{
          header: () => (
            <View className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 mx-auto px-6 md:px-8 h-16 flex flex-row w-full items-center justify-between">
              <Text role="heading" aria-level={1} className="text-2xl font-bold tracking-tight text-[#FF5937]">
                Ridi plans
              </Text>
              <Link
                role="button"
                className="w-10 h-10 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-[#FF5937] transition-colors"
                aria-label="Profile"
                href="/settings"
              >
                <UserCircle className="w-8 h-8" />
              </Link>
            </View>
          ),
        }} />
        <View role="main" className="flex flex-row justify-center pt-8 px-6 md:px-8 pb-24">
          <View className="max-w-3xl flex-1 mx-2">
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
        className="fixed bottom-8 right-8 w-24 h-24 bg-[#FF5937] rounded-full shadow-lg flex items-center justify-center hover:bg-[#ff4a25] transition-colors"
        aria-label="Create new plan"
        href="/plans/new"
      >
        <Plus className="w-12 h-12 text-white dark:text-gray-900" />
      </Link>
    </>
  );
}
