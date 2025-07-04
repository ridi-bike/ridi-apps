import { Link, useRouter } from "expo-router";
import { AnimatePresence, MotiView } from "moti";
import { View, Text, ScrollView } from "react-native";

import { RouteCard } from "~/components/route-card";
import { ScreenFrame } from "~/components/screen-frame";
import { useRoutesDownlaoded } from "~/lib/data-stores/routes";

export default function MyRoutes() {
  const router = useRouter();
  const routes = useRoutesDownlaoded();
  return (
    <ScreenFrame
      title="My routes"
      onGoBack={() =>
        router.canGoBack() ? router.back() : router.replace("/plans")
      }
    >
      <View className="flex w-full flex-col items-center justify-start">
        <AnimatePresence exitBeforeEnter>
          {routes && (
            <MotiView
              key="plan"
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mx-2 w-full max-w-5xl"
            >
              <ScrollView className="h-[calc(100vh-100px)] pb-12">
                <View className="mx-2 w-full pr-4 md:max-w-5xl">
                  <Text
                    role="heading"
                    aria-level={2}
                    className="my-6 text-2xl font-bold dark:text-gray-100"
                  >
                    My Routes
                  </Text>
                  <View className="grid grid-cols-1 gap-6 pb-24 md:grid-cols-2 lg:grid-cols-3">
                    {routes.map((route) => (
                      <Link
                        key={route.id}
                        href={`/plans/${route.planId}/${route.id}`}
                      >
                        <RouteCard routeId={route.id} />
                      </Link>
                    ))}
                  </View>
                </View>
              </ScrollView>
            </MotiView>
          )}
        </AnimatePresence>
      </View>
    </ScreenFrame>
  );
}
