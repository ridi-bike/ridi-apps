import { Link, useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import {
  type MotiPressableTransitionProp,
  type MotiPressableProp,
} from "moti/interactions";
import { MotiPressable } from "moti/interactions";
import { useMemo } from "react";
import { View, Text } from "react-native";

import { PlanCard } from "~/components/plan-card";
import { ScreenFrame } from "~/components/screen-frame";
import { useStorePlans } from "~/lib/stores/plans-store";

export default function PlansPage() {
  const { data: plans, error, status } = useStorePlans();
  const router = useRouter();
  const animate: MotiPressableProp = useMemo(
    () =>
      ({ hovered, pressed }) => {
        "worklet";

        return {
          opacity: hovered || pressed ? 0.5 : 1,
        };
      },
    [],
  );
  const transition: MotiPressableTransitionProp = useMemo(
    () =>
      ({ hovered, pressed }) => {
        "worklet";

        return {
          delay: hovered || pressed ? 0 : 100,
        };
      },
    [],
  );
  if (!plans) {
    return <Text>Loading</Text>;
  }

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
            <MotiPressable
              key={index}
              onPress={() => router.navigate(`/plans/${plan.id}`)}
              animate={animate}
              transition={transition}
            >
              <PlanCard
                startDesc={plan.startDesc}
                finishDesc={plan.finishDesc}
                startCoords={{ lat: plan.startLat, lon: plan.startLon }}
                finishCoords={
                  plan.finishLat && plan.finishLon
                    ? { lat: plan.finishLat, lon: plan.finishLon }
                    : null
                }
                bearing={plan.bearing}
                distance={plan.distance}
                tripType={plan.tripType}
              />
            </MotiPressable>
          ))}
        </View>
      </View>
    </ScreenFrame>
  );
}
