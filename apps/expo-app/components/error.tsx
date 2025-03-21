import * as Sentry from "@sentry/react-native";
import * as Clipboard from "expo-clipboard";
import { AlertCircle, Copy, RefreshCcw } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { generate } from "xksuid";

import { MotiPressable } from "~/lib/nativewind";

export function ErrorBox({
  retry,
  error,
  refId,
}: {
  retry?: () => void;
  error?: Error;
  refId?: string;
}) {
  const [errorId] = useState(refId || generate());

  useEffect(() => {
    Sentry.captureException(error, {
      event_id: errorId,
    });
  }, [error, errorId]);

  const copyToClipboard = useCallback(
    () => Clipboard.setStringAsync(errorId),
    [errorId],
  );

  return (
    <View
      role="article"
      className={
        "w-full rounded-2xl border-2 border-black bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800"
      }
    >
      <View className="mb-4 flex flex-row items-start gap-3">
        <AlertCircle className="mt-1 size-6 text-[#FF5937]" />
        <View className="flex size-full flex-col items-start justify-center">
          <Text
            role="heading"
            aria-level={3}
            className={
              "mb-2 w-full text-xl font-bold text-[#FF5937] dark:text-gray-100"
            }
          >
            Error Details
          </Text>
          <Text className={"mb-4 w-full text-gray-700 dark:text-gray-200"}>
            We&apos;ve logged this incident and our team is already working on
            it. If you need to contact support, please reference this error ID:
          </Text>
          <View
            className={
              "flex w-full flex-row items-center gap-2 rounded-lg border-2 border-[#FF5937] bg-white p-3 dark:border-gray-700 dark:bg-gray-900"
            }
          >
            <Text
              className={
                "w-full font-mono font-bold text-[#FF5937] dark:text-gray-200"
              }
            >
              {errorId}
            </Text>
            <MotiPressable
              animate={({ pressed }) => {
                "worklet";

                return {
                  scale: pressed ? 1.2 : 1,
                };
              }}
              onPress={copyToClipboard}
              accessibilityLabel="Copy error ID"
              className={
                "ml-auto w-full rounded-md p-1 transition-colors hover:bg-[#FFF5F3] dark:hover:bg-gray-800"
              }
            >
              <Copy className="size-4 text-[#FF5937]" />
            </MotiPressable>
          </View>
        </View>
      </View>
      {retry && (
        <Pressable
          onPress={retry}
          className={
            "mt-4 flex w-full flex-row items-center justify-center gap-2 rounded-lg bg-[#FF5937] px-6 py-3 hover:bg-[#ff4720]"
          }
        >
          <RefreshCcw className="size-5" />
          <Text className={"font-bold text-white dark:text-gray-100"}>
            Try Again
          </Text>
        </Pressable>
      )}
    </View>
  );
}
