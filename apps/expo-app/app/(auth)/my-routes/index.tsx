import { Link, useRouter } from "expo-router";
import { AnimatePresence, MotiView } from "moti";
import { View, Text, ScrollView } from "react-native";

import { ErrorBox } from "~/components/error";
import { Loading } from "~/components/loading";
import { RouteCard } from "~/components/route-card";
import { ScreenFrame } from "~/components/screen-frame";
import { useStoreRoutesDownloaded } from "~/lib/stores/routes-downloaded-store";

export default function PlanDetails() {
  const router = useRouter();
  const { data: routes, error, status, refetch } = useStoreRoutesDownloaded();

  return (
    <ScreenFrame
      title="My routes"
      onGoBack={() =>
        router.canGoBack() ? router.back() : router.replace("/plans")
      }
    >
      <View className="flex w-full flex-col items-center justify-start">
        <AnimatePresence exitBeforeEnter>
          {!routes && !error && (
            <View
              key="loading"
              className="flex w-full flex-row items-center justify-center"
            >
              <Loading className="size-12 text-[#ff4a25]" />
            </View>
          )}
          {!!error && status !== "pending" && (
            <MotiView
              key="error"
              from={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mx-2 max-w-5xl flex-1"
            >
              <ErrorBox error={error} retry={refetch} />
            </MotiView>
          )}
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
                    {routes.data.map((route) => (
                      <Link
                        key={route.id}
                        href={`/plans/${route.planId}/${route.id}`}
                      >
                        <RouteCard
                          routeShort={{
                            routeId: route.id,
                            routeName: route.name,
                            routeCreatedAt: route.createdAt,
                            routeDownloadedAt: route.downloadedAt,
                            routeMapPreviewDark: route.mapPreviewDark,
                            routeMapPreviewLight: route.mapPreviewLight,
                          }}
                        />
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
