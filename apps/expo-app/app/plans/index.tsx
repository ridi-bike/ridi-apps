import { Link } from "expo-router";
import { Plus } from "lucide-react-native";
import { View } from "react-native";

import { PlanCard } from "~/components/plan-card";
import { ScreenFrame } from "~/components/screen-frame";

export default function PlansPage() {
  const plans = [
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
    {
      startAddress: "789 Mission St, San Francisco, CA",
      endAddress: "321 Howard St, San Francisco, CA",
      distance: "2.8 miles",
      startCoords: [37.7855, -122.4071],
      finishCoords: [37.7897, -122.3947],
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
    <ScreenFrame
      title="Ridi plans"
      floating={
        <Link
          className="fixed bottom-8 right-8 flex size-24 items-center justify-center rounded-full bg-[#FF5937] shadow-lg transition-colors hover:bg-[#ff4a25]"
          aria-label="Create new plan"
          href="/plans/new"
        >
          <Plus className="size-12 text-white dark:text-gray-900" />
        </Link>
      }
    >
      <View className="mx-2 max-w-5xl flex-1">
        <View className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {plans.map((plan, index) => (
            <Link key={index} href="/plans/1">
              <PlanCard {...plan} />
            </Link>
          ))}
        </View>
      </View>
    </ScreenFrame>
  );
}
