import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { CheckIcon } from "lucide-react-native";
import { AnimatePresence, MotiView } from "moti";
import { useEffect, useState } from "react";
import { Pressable, View, Text } from "react-native";
import { z } from "zod";

import { ErrorBox } from "~/components/error";
import { Loading } from "~/components/loading";
import { ScreenFrame } from "~/components/screen-frame";
import { apiClient } from "~/lib/api";
import { getSuccessResponseOrThrow } from "~/lib/stores/util";
import { useUrlParams } from "~/lib/url-params";
import { cn } from "~/lib/utils";

const DATA_VERSION = "v1";

export default function BillingPage() {
  const [loading, setLoading] = useState(false);
  const [stripeSuccess, setStripeSuccess] = useUrlParams("stripe", z.boolean());
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["billing", DATA_VERSION],
    queryFn: () =>
      apiClient
        .billingGet({
          query: {
            version: DATA_VERSION,
          },
        })
        .then((resp) => getSuccessResponseOrThrow(200, resp).data),
  });

  useEffect(() => {
    if (stripeSuccess) {
      setLoading(true);
      apiClient
        .stripeSuccess()
        .then(() => {
          setStripeSuccess();
          setLoading(false);
          refetch();
        })
        .catch(console.error);
    }
  }, [refetch, setStripeSuccess, stripeSuccess]);

  return (
    <ScreenFrame
      onGoBack={() =>
        router.canGoBack() ? router.back() : router.push("/plans")
      }
      title="Billing"
    >
      <View className="flex size-full flex-col items-center justify-start">
        <AnimatePresence>
          {(loading || isLoading) && (
            <Loading className="size-12 text-[#ff4a25]" />
          )}
          {!!error && (
            <View className="mx-2 max-w-5xl flex-1">
              <ErrorBox error={error} retry={refetch} />
            </View>
          )}
          {!loading && !isLoading && (
            <MotiView className="flex min-h-screen w-full flex-col items-center justify-start bg-white px-6 md:px-8 dark:bg-gray-900">
              {data?.subscription?.price ? (
                <View className="mb-8 w-full md:max-w-2xl">
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
                          {data.subscription.price.priceType === "yearly"
                            ? "Yearly"
                            : "Monthly"}{" "}
                          Plan
                        </Text>
                        <Text className="text-gray-600 dark:text-gray-200">
                          {data.subscription.price.price} EUR/
                          {data.subscription.price.priceType === "yearly"
                            ? "year"
                            : "month"}
                        </Text>
                      </View>
                      <View className="flex flex-col items-end justify-start gap-2">
                        {data.subscription.isActive ? (
                          <Text className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                            Active
                          </Text>
                        ) : (
                          <Text className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
                            Inactive
                          </Text>
                        )}
                        {!data.subscription.currentPeriodWillRenew && (
                          <Text className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800">
                            Ends on{" "}
                            {data.subscription.currentPeriodEndDate
                              ? new Date(
                                  data.subscription.currentPeriodEndDate,
                                ).toDateString()
                              : ""}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View className="flex flex-row gap-3">
                      <Pressable
                        onPress={() => {
                          window.location.href = data.stripeUrl || "";
                        }}
                        accessibilityRole="button"
                        className="flex-1 rounded-xl border-2 border-black bg-[#FF5937] px-4 py-2 font-medium text-white transition-colors hover:bg-[#ff4a25] dark:border-gray-700"
                      >
                        <Text className="text-center font-medium text-white">
                          Manage plan
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ) : (
                <View className="mb-8 flex w-full flex-col gap-4 md:max-w-2xl">
                  {data?.prices.map((price) => (
                    <View
                      key={price.id}
                      className={cn(
                        "bg-white dark:bg-gray-900 rounded-2xl shadow-lg border-2 border-black dark:border-gray-700 p-6",
                        {
                          "relative overflow-hidden":
                            price.priceType === "yearly",
                        },
                      )}
                    >
                      {price.priceType === "yearly" && (
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
                            {price.priceType === "yearly"
                              ? "Yearly"
                              : "Monthly"}{" "}
                            Plan
                          </Text>
                          <Text className="mt-2 text-2xl font-bold dark:text-gray-100">
                            {price.price.toFixed(2)} EUR
                            <Text className="text-base font-normal text-gray-600 dark:text-gray-200">
                              /{price.priceType === "yearly" ? "year" : "month"}
                            </Text>
                          </Text>
                          {price.priceType === "yearly" && (
                            <Text className="mt-1 text-sm text-gray-600 dark:text-gray-200">
                              Only {price.priceMontly.toFixed(2)} EUR/month
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
                      </View>
                      <Pressable
                        onPress={() => {
                          setLoading(true);
                          apiClient
                            .stripeCheckout({
                              query: {
                                priceType: price.priceType,
                              },
                            })
                            .then(
                              (checkout) =>
                                (window.location.href =
                                  getSuccessResponseOrThrow(
                                    200,
                                    checkout,
                                  ).stripeUrl),
                            );
                        }}
                        accessibilityRole="button"
                        className="w-full rounded-xl border-2 border-black bg-[#FF5937] px-4 py-2 font-medium text-white transition-colors hover:bg-[#ff4a25] dark:border-gray-700"
                      >
                        <Text className="text-center font-medium text-white">
                          Choose Plan
                        </Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </MotiView>
          )}
        </AnimatePresence>
      </View>
    </ScreenFrame>
  );
}
