import { router } from "expo-router";
import { UserCircle, CheckIcon } from "lucide-react-native";
import { AnimatePresence, MotiView } from "moti";
import { useMemo, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";

import { ErrorBox } from "~/components/error";
import { Loading } from "~/components/loading";
import { ScreenFrame } from "~/components/screen-frame";
import { apiClient } from "~/lib/api";
import { getSuccessResponseOrThrow } from "~/lib/stores/util";
import { cn } from "~/lib/utils";

type SubscriptionOption = {
  id: string;
  type: "monthly" | "yearly";
  price: number;
  monthlyEquivalent?: number;
  onSelect: () => void;
};

export default function BillingPage() {
  const [loading, setLoading] = useState(false);
  // const [activeSubscriptionId, setActiveSubscriptionId] = useState<
  //   string | null
  // >(null);
  // const [error, setError] = useState<Error | null>(null);
  //
  // const subscriptionOptions = useMemo((): SubscriptionOption[] => {
  //   return [
  //     {
  //       id: "monthly",
  //       type: "monthly",
  //       price: 2.95,
  //       onSelect: () => {
  //         setLoading(true);
  //         apiClient
  //           .stripeCheckout({
  //             query: {
  //               priceType: "montly",
  //             },
  //           })
  //           .then((resp) => getSuccessResponseOrThrow(200, resp))
  //           .then((resp) => (window.location.href = resp.stripeUrl))
  //           .catch((e) =>
  //             setError(new Error("Faield to start Stripe checkout", e)),
  //           );
  //       },
  //     },
  //     {
  //       id: "yearly",
  //       type: "yearly",
  //       price: 19.8,
  //       monthlyEquivalent: 1.65,
  //       onSelect: () => {
  //         setLoading(true);
  //         apiClient
  //           .stripeCheckout({
  //             query: {
  //               priceType: "yearly",
  //             },
  //           })
  //           .then((resp) => getSuccessResponseOrThrow(200, resp))
  //           .then((resp) => (window.location.href = resp.stripeUrl))
  //           .catch((e) =>
  //             setError(new Error("Faield to start Stripe checkout", e)),
  //           );
  //       },
  //     },
  //   ];
  // }, []);
  //
  // const activeSubscription = useMemo(() => {
  //   return (
  //     subscriptionOptions.find((sub) => sub.id === activeSubscriptionId) || null
  //   );
  // }, [activeSubscriptionId, subscriptionOptions]);

  return (
    <ScreenFrame
      onGoBack={() =>
        router.canGoBack() ? router.back() : router.push("/plans")
      }
      title="Billing"
    >
      <AnimatePresence>
        {Loading && <Loading className="size-12 text-[#ff4a25]" />}
        {!!error && (
          <View className="mx-2 max-w-5xl flex-1">
            <ErrorBox error={error} retry={() => setError(null)} />
          </View>
        )}
        {!loading && (
          <MotiView className="min-h-screen w-full bg-white dark:bg-gray-900">
            <View
              role="banner"
              className="fixed inset-x-0 top-0 z-10 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
            >
              <View className="mx-auto flex h-16 max-w-3xl flex-row items-center justify-between px-6 md:px-8">
                <Text
                  role="heading"
                  aria-level={1}
                  className="text-2xl font-bold tracking-tight text-[#FF5937] dark:text-gray-100"
                >
                  Subscription
                </Text>
                <TouchableOpacity
                  className={
                    "flex size-10 flex-row items-center justify-center text-gray-600 transition-colors hover:text-[#FF5937]"
                  }
                  accessibilityLabel="Profile"
                  accessibilityRole="button"
                >
                  <UserCircle className="size-8" />
                </TouchableOpacity>
              </View>
            </View>
            <View role="main" className="px-6 py-24 md:px-8">
              <View className="mx-auto max-w-3xl">
                {activeSubscription ? (
                  <View className="mb-8">
                    <Text
                      role="heading"
                      aria-level={2}
                      className="mb-4 text-lg font-bold dark:text-gray-100"
                    >
                      Current Subscription
                    </Text>
                    <View className="rounded-2xl border-2 border-black bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                      <View className="mb-4 flex flex-row items-center justify-between">
                        <View>
                          <Text className="text-lg font-bold dark:text-gray-200">
                            {activeSubscription.type === "yearly"
                              ? "Yearly"
                              : "Monthly"}{" "}
                            Plan
                          </Text>
                          <Text className="text-gray-600 dark:text-gray-200">
                            {activeSubscription.price} EUR/
                            {activeSubscription.type === "yearly"
                              ? "year"
                              : "month"}
                          </Text>
                        </View>
                        <Text className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                          Active
                        </Text>
                      </View>
                      <View className="flex flex-row gap-3">
                        <TouchableOpacity
                          accessibilityRole="button"
                          className="flex-1 rounded-xl border-2 border-black px-4 py-2 font-medium transition-colors hover:bg-gray-50 dark:border-gray-700"
                        >
                          <Text className="text-center font-medium dark:text-gray-200">
                            Cancel
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          accessibilityRole="button"
                          className="flex-1 rounded-xl border-2 border-black bg-[#FF5937] px-4 py-2 font-medium text-white transition-colors hover:bg-[#ff4a25] dark:border-gray-700"
                        >
                          <Text className="text-center font-medium text-white">
                            Change Plan
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View className="space-y-4">
                    {subscriptionOptions.map((option) => (
                      <View
                        key={option.id}
                        className={cn(
                          "bg-white dark:bg-gray-900 rounded-2xl shadow-lg border-2 border-black dark:border-gray-700 p-6",
                          {
                            "relative overflow-hidden":
                              option.type === "yearly",
                          },
                        )}
                      >
                        {option.type === "yearly" && (
                          <View className="absolute right-4 top-4 rounded-full bg-[#FF5937] px-3 py-1 text-white">
                            <Text className="text-sm font-medium text-white">
                              Best Value
                            </Text>
                          </View>
                        )}
                        <View className="mb-4 flex flex-row items-start justify-between">
                          <View>
                            <Text
                              role="heading"
                              aria-level={3}
                              className="text-lg font-bold dark:text-gray-100"
                            >
                              {option.type === "yearly" ? "Yearly" : "Monthly"}{" "}
                              Plan
                            </Text>
                            <Text className="mt-2 text-2xl font-bold dark:text-gray-100">
                              {option.price} EUR
                              <Text className="text-base font-normal text-gray-600 dark:text-gray-200">
                                /{option.type === "yearly" ? "year" : "month"}
                              </Text>
                            </Text>
                            {option.monthlyEquivalent && (
                              <Text className="mt-1 text-sm text-gray-600 dark:text-gray-200">
                                Only {option.monthlyEquivalent} EUR/month
                              </Text>
                            )}
                          </View>
                        </View>
                        <View role="list" className="mb-6 space-y-2">
                          <View
                            role="listitem"
                            className="flex flex-row items-center gap-2"
                          >
                            <CheckIcon className="size-5 text-[#FF5937]" />
                            <Text className="dark:text-gray-200">
                              Unlimited route planning
                            </Text>
                          </View>
                          <View
                            role="listitem"
                            className="flex flex-row items-center gap-2"
                          >
                            <CheckIcon className="size-5 text-[#FF5937]" />
                            <Text className="dark:text-gray-200">
                              Save favorite routes
                            </Text>
                          </View>
                          <View
                            role="listitem"
                            className="flex flex-row items-center gap-2"
                          >
                            <CheckIcon className="size-5 text-[#FF5937]" />
                            <Text className="dark:text-gray-200">
                              Premium support
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          accessibilityRole="button"
                          className="w-full rounded-xl border-2 border-black bg-[#FF5937] px-4 py-2 font-medium text-white transition-colors hover:bg-[#ff4a25] dark:border-gray-700"
                        >
                          <Text className="text-center font-medium text-white">
                            Choose Plan
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </MotiView>
        )}
      </AnimatePresence>
    </ScreenFrame>
  );
}
