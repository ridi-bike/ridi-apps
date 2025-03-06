import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import { AnimatePresence, MotiView } from "moti";
import {
  type MotiPressableTransitionProp,
  type MotiPressableProp,
} from "moti/interactions";
import { useEffect, useMemo } from "react";
import { ScrollView, View } from "react-native";

import { ErrorBox } from "~/components/error";
import { Loading } from "~/components/loading";
import { PlanCard } from "~/components/plan-card";
import { ScreenFrame } from "~/components/screen-frame";
import { MotiPressable } from "~/lib/nativewind";
import { useStorePlans } from "~/lib/stores/plans-store";

export default function PlansPage() {
  const { data: plans, error, status, refetch } = useStorePlans();
  const router = useRouter();
  const animate: MotiPressableProp = useMemo(
    () =>
      ({ hovered, pressed }) => {
        "worklet";

        return {
          opacity: pressed ? 0.5 : 1,
          scale: hovered ? 1.01 : 1,
        };
      },
    [],
  );
  const transition: MotiPressableTransitionProp = useMemo(
    () =>
      ({ hovered, pressed }) => {
        "worklet";

        return {
          delay: hovered || pressed ? 0 : 50,
        };
      },
    [],
  );

  useEffect(() => {
    if (plans?.length === 0) {
      router.push("/plans/new");
    }
  }, [plans, router]);

  return (
    <ScreenFrame
      title="Ridi plans"
      floating={
        <AnimatePresence>
          {!!plans && (
            <MotiPressable
              className="fixed bottom-8 right-8 flex size-24 items-center justify-center rounded-full bg-[#FF5937] shadow-lg transition-colors hover:bg-[#ff4a25]"
              aria-label="Create new plan"
              from={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
              transition={{
                type: "timing",
                delay: 100,
                duration: 500,
              }}
              onPress={() => router.navigate("/plans/new")}
            >
              <Plus className="size-12 text-white dark:text-gray-900" />
            </MotiPressable>
          )}
        </AnimatePresence>
      }
    >
      <AnimatePresence>
        {!!error && status !== "pending" && (
          <View className="mx-2 max-w-5xl flex-1">
            <ErrorBox error={error} retry={refetch} />
          </View>
        )}
        {!plans && !error && <Loading className="size-12 text-[#ff4a25]" />}
        {!!plans && (
          <MotiView
            className="mx-2 max-w-5xl flex-1"
            from={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            transition={{
              type: "timing",
              delay: 100,
              duration: 500,
            }}
          >
            <ScrollView className="h-[calc(100vh-100px)]">
              <View className="grid size-full grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                      state={plan.state}
                    />
                  </MotiPressable>
                ))}
              </View>
            </ScrollView>
          </MotiView>
        )}
      </AnimatePresence>
    </ScreenFrame>
  );
}
