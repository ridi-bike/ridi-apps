import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, router } from "expo-router";
import { CheckIcon } from "lucide-react-native";
import { AnimatePresence, MotiView } from "moti";
import { useEffect, useState } from "react";
import { Pressable, View, Text, ScrollView } from "react-native";
import { z } from "zod";

import { ErrorBox } from "~/components/error";
import { Input } from "~/components/input";
import { Loading } from "~/components/loading";
import { ScreenFrame } from "~/components/screen-frame";
import { apiClient } from "~/lib/api";
import { posthogClient } from "~/lib/posthog/client";
import { getSuccessResponseOrThrow } from "~/lib/stores/util";
import { useUrlParams } from "~/lib/url-params";
import { useUser } from "~/lib/useUser";
import { cn } from "~/lib/utils";

const DATA_VERSION = "v1";

export default function BillingPage() {
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useUrlParams("ridi-code", z.string());

  const {
    user,
    isLoading: isLoadingUser,
    error: errorUser,
    refetch: refetchUser,
  } = useUser();

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
      posthogClient.captureEvent("billing-subscription-success");
      setLoading(true);
      setTimeout(
        () =>
          apiClient
            .stripeSuccess()
            .then(() => {
              setStripeSuccess();
              setLoading(false);
              refetch();
            })
            .catch(console.error),
        500,
      );
    }
  }, [refetch, setStripeSuccess, stripeSuccess]);

  const queryClient = useQueryClient();
  const {
    isPending,
    mutate: codeClaim,
    error: errorCode,
    data: codeClaimData,
  } = useMutation({
    mutationFn: (c: string) =>
      apiClient.codeClaim({
        body: {
          version: "v1",
          data: {
            code: c,
          },
        },
      }),
    onSuccess: () => {
      posthogClient.captureEvent("billing-code-claim-succeeded");
      queryClient.invalidateQueries({ queryKey: ["billing", DATA_VERSION] });
    },
  });

  if (user?.isAnonymous) {
    return <Redirect href="/login" />;
  }

  return (
    <ScreenFrame
      onGoBack={() => router.replace("/settings")}
      title="Ridi supporter"
    >
      <View className="flex size-full flex-col items-center justify-start">
        <AnimatePresence>
          {user?.subType === "code" && (
            <View key="code" className="mb-8 w-full md:max-w-2xl">
              <Text
                role="heading"
                aria-level={2}
                className="mb-4 text-lg font-bold dark:text-gray-100"
              >
                Current Supporter level
              </Text>
              <View className="rounded-2xl border-2 border-black bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                <View className="flex flex-row items-center justify-between">
                  <View className="flex flex-col items-end justify-center gap-2">
                    <Text className="rounded-full bg-green-100 px-3 py-2 text-sm font-medium text-green-800">
                      Active
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
          {user && user.subType !== "code" && (
            <>
              {(loading || isLoading || isLoadingUser || isPending) && (
                <View className="flex w-full flex-row items-center justify-center">
                  <Loading className="size-12 text-[#ff4a25]" />
                </View>
              )}
              {!!error && (
                <View className="mx-2 max-w-5xl flex-1">
                  <ErrorBox error={error} retry={refetch} />
                </View>
              )}
              {!!errorUser && (
                <View className="mx-2 max-w-5xl flex-1">
                  <ErrorBox error={errorUser} retry={refetchUser} />
                </View>
              )}
              {!!errorCode && (
                <View className="mx-2 max-w-5xl flex-1">
                  <ErrorBox
                    error={errorCode}
                    retry={() => codeClaim(code || "")}
                  />
                </View>
              )}
              {!loading && !isLoading && !isLoadingUser && !isPending && (
                <ScrollView className="h-[calc(100vh-130px)] w-full">
                  <MotiView className="flex min-h-screen w-full flex-col items-center justify-start bg-white px-6 pb-24 md:px-8 dark:bg-gray-900">
                    {data?.subscription?.price && (
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
                                Supporter
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
                              role="button"
                              onPress={() => {
                                window.location.href = data.stripeUrl || "";
                              }}
                              accessibilityRole="button"
                              className="flex-1 rounded-xl border-2 border-black bg-[#FF5937] px-4 py-2 font-medium text-white transition-colors hover:bg-[#ff4a25] dark:border-gray-700"
                            >
                              <Text className="text-center font-medium text-white">
                                Manage supporter status
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      </View>
                    )}
                    {(!data?.subscription ||
                      data.subscription.status !== "active") && (
                      <View className="mb-8 flex w-full flex-col gap-4 md:max-w-2xl">
                        {data?.prices?.map((price) => (
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
                                  Supporter
                                </Text>
                                <Text className="mt-2 text-2xl font-bold dark:text-gray-100">
                                  {price.price.toFixed(2)} EUR
                                  <Text className="text-base font-normal text-gray-600 dark:text-gray-200">
                                    /
                                    {price.priceType === "yearly"
                                      ? "year"
                                      : "month"}
                                  </Text>
                                </Text>
                                {price.priceType === "yearly" && (
                                  <Text className="mt-1 text-sm text-gray-600 dark:text-gray-200">
                                    Only {price.priceMontly.toFixed(2)}{" "}
                                    EUR/month
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
                                  Your support helps further Ridi development
                                </Text>
                              </View>
                              <View
                                role="listitem"
                                className="flex flex-row items-center gap-2"
                              >
                                <CheckIcon className="size-5 text-[#FF5937]" />
                                <Text className="dark:text-gray-200">
                                  Download as many GPX files as you want and
                                  ride as much as you can!
                                </Text>
                              </View>
                            </View>
                            <Pressable
                              role="button"
                              onPress={() => {
                                posthogClient.captureEvent(
                                  "billing-subscription-selected",
                                  { ...price },
                                );
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
                        <View
                          className={cn(
                            "bg-white dark:bg-gray-900 rounded-2xl w-full shadow-lg border-2 border-black dark:border-gray-700 p-6",
                          )}
                        >
                          <View className="mb-4 flex w-full flex-row items-start justify-between">
                            <View className="w-full">
                              <Text
                                role="heading"
                                aria-level={3}
                                className="text-lg font-bold dark:text-gray-100"
                              >
                                Claim code
                              </Text>
                              <Text className="mt-2 w-full">
                                {!!codeClaimData &&
                                  codeClaimData.status !== 201 && (
                                    <Text className="text-2xl font-bold text-red-600 dark:text-gray-100">
                                      {(
                                        codeClaimData.body as {
                                          message?: string;
                                        }
                                      ).message || "Error happened"}
                                    </Text>
                                  )}
                                <Input
                                  label="Enter code to claim it"
                                  className="w-full"
                                  value={code}
                                  onChangeText={(v) => setCode(v)}
                                />
                              </Text>
                            </View>
                          </View>
                          <Pressable
                            role="button"
                            onPress={() => {
                              if (code) {
                                posthogClient.captureEvent(
                                  "billing-code-claim-attempted",
                                );
                                codeClaim(code);
                              }
                            }}
                            accessibilityRole="button"
                            className="w-full rounded-xl border-2 border-black bg-[#FF5937] px-4 py-2 font-medium text-white transition-colors hover:bg-[#ff4a25] dark:border-gray-700"
                          >
                            <Text className="text-center font-medium text-white">
                              Claim
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    )}
                  </MotiView>
                </ScrollView>
              )}
            </>
          )}
        </AnimatePresence>
      </View>
    </ScreenFrame>
  );
}
