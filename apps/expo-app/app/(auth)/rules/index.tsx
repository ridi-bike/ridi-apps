import {
  type RuleSetsSetRequest,
  type RuleSetsListResponse,
} from "@ridi/api-contracts";
import { router } from "expo-router";
import {
  Copy,
  Eye,
  MoreVertical,
  Trash2,
  Check,
  Settings,
  User,
  Plus,
} from "lucide-react-native";
import { AnimatePresence, MotiView } from "moti";
import { useCallback, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { generate } from "xksuid";
import { z } from "zod";

import { Button } from "~/components/button";
import { ErrorBox } from "~/components/error";
import { Loading } from "~/components/loading";
import { ScreenFrame } from "~/components/screen-frame";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { posthogClient } from "~/lib/posthog/client";
import { useStoreRuleSets } from "~/lib/stores/rules-store";
import { useUrlParams } from "~/lib/url-params";
import { cn } from "~/lib/utils";

type RuleSet = RuleSetsListResponse["data"][number];
type RuleSetNew = RuleSetsSetRequest["data"];

function DeleteConfirmDialog({
  children,
  ruleSet,
  onDelete,
}: {
  children: React.ReactNode;
  ruleSet: RuleSet;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog
      className="w-full"
      open={open}
      onOpenChange={(open) => setOpen(open)}
    >
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="w-full border-black bg-white dark:border-gray-700 dark:bg-gray-800">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex flex-row items-center justify-between dark:text-gray-100">
            Delete Rule Set
          </AlertDialogTitle>
          <AlertDialogDescription>
            <Text>
              Are you sure you want to delete this rule set
              <Text>&apos;{ruleSet.name}&apos;</Text>? This action is permanent.
            </Text>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex w-full flex-col items-center justify-between">
          <View className="flex w-full flex-col items-center justify-between gap-6">
            <Button
              variant="primary"
              className="flex w-full flex-row items-center justify-center"
              onPress={() => {
                posthogClient.captureEvent("rule-set-deleted", {
                  ruleSetId: ruleSet.id,
                });
                setOpen(false);
                onDelete();
              }}
            >
              <Text className="dark:text-gray-200">Delete</Text>
            </Button>
            <Button
              variant="secondary"
              className="flex w-full flex-row items-center justify-center"
              onPress={() => setOpen(false)}
            >
              <Text className="dark:text-gray-200">Cancel</Text>
            </Button>
          </View>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ActionDialog({
  children,
  ruleSet,
  onDuplicate,
  onDelete,
}: {
  children: React.ReactNode;
  ruleSet: RuleSet;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog
      className="w-full"
      open={open}
      onOpenChange={(open) => setOpen(open)}
    >
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="w-full border-black bg-white dark:border-gray-700 dark:bg-gray-800">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex flex-row items-center justify-between dark:text-gray-100">
            {ruleSet.name}
          </AlertDialogTitle>
          <AlertDialogDescription>
            <View className="flex w-full flex-col items-center justify-between gap-2">
              <Pressable
                role="button"
                onPress={() => {
                  posthogClient.captureEvent("rule-set-opened", {
                    ruleSetId: ruleSet.id,
                  });
                  setOpen(false);
                  router.navigate(`/rules/${ruleSet.id}`);
                }}
                className="h-14 w-full flex-row items-center gap-3 rounded-xl border-[3px] border-black px-4 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                <Eye className="size-4 dark:text-gray-200" />
                <Text className="font-medium dark:text-gray-200">
                  {ruleSet.isSystem ? "View rules" : "Edit rules"}
                </Text>
              </Pressable>
              <Pressable
                role="button"
                onPress={() => {
                  posthogClient.captureEvent("rule-set-duplicated", {
                    ruleSetId: ruleSet.id,
                  });
                  setOpen(false);
                  onDuplicate();
                }}
                className="h-14 w-full flex-row items-center gap-3 rounded-xl border-[3px] border-black px-4 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                <Copy className="size-4 dark:text-gray-200" />
                <Text className="font-medium dark:text-gray-200">
                  Duplicate
                </Text>
              </Pressable>
              {!ruleSet.isSystem && (
                <DeleteConfirmDialog
                  ruleSet={ruleSet}
                  onDelete={() => {
                    setOpen(false);
                    onDelete();
                  }}
                >
                  <Pressable
                    role="button"
                    className={cn(
                      "dark:border-red-700 dark:hover:bg-red-950 w-full h-14 flex-row items-center px-4 gap-3 rounded-xl border-[3px] border-red-500 text-red-500 hover:bg-red-50 transition-colors",
                    )}
                  >
                    <Trash2 className="size-4 text-red-500" />
                    <Text className="font-medium text-red-500">Delete</Text>
                  </Pressable>
                </DeleteConfirmDialog>
              )}
            </View>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex w-full flex-col items-center justify-between gap-6">
          <Button
            variant="secondary"
            className="flex w-full flex-row items-center justify-center"
            onPress={() => setOpen(false)}
          >
            <Text className="dark:text-gray-200">Cancel</Text>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function RuleSetList() {
  const {
    data: ruleSets,
    ruleSetSet,
    ruleSetDelete,
    status,
    error,
    refetch,
  } = useStoreRuleSets();
  const [selectedId] = useUrlParams("rule", z.string());
  const setSelectedId = () => undefined;
  const addRuleSet = useCallback(() => {
    if (ruleSets) {
      const newRuleSet: RuleSetNew = {
        id: generate(),
        name: "New rule set",
        roadTags: Object.keys(ruleSets[0].roadTags).reduce(
          (all, curr) => ({
            ...all,
            [curr]: 0,
          }),
          {} as RuleSetNew["roadTags"],
        ),
      };
      ruleSetSet(newRuleSet);
    }
  }, [ruleSetSet, ruleSets]);

  const duplicateRuleSet = useCallback(
    (ruleSet: RuleSet) => {
      ruleSetSet({
        ...ruleSet,
        name: `Copy of ${ruleSet.name}`,
        id: generate(),
      });
    },
    [ruleSetSet],
  );

  const gotoNewScreen = useCallback((params?: Record<string, string>) => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/plans/new");
    }
    setTimeout(() => router.setParams(params), 500);
  }, []);

  return (
    <ScreenFrame
      title="Rule sets"
      onGoBack={gotoNewScreen}
      floating={
        <View className="fixed bottom-0 w-full bg-white p-4 dark:bg-gray-800">
          <Pressable
            role="button"
            aria-label="Create new rule set"
            className="fixed bottom-8 right-8 flex size-24 items-center justify-center rounded-full bg-[#FF5937] shadow-lg transition-colors hover:bg-[#ff4a25]"
            onPress={addRuleSet}
          >
            <Plus className="size-12 text-white dark:text-gray-900" />
          </Pressable>
        </View>
      }
    >
      <View className="flex w-full flex-col items-center justify-start">
        <View className="mx-2 flex w-full flex-col items-center justify-start md:max-w-5xl">
          <AnimatePresence exitBeforeEnter>
            {!ruleSets && (
              <View
                key="loading"
                className="flex w-full flex-row items-center justify-center"
              >
                <Loading className="size-12 text-[#ff4a25]" />
              </View>
            )}
            {!!ruleSets && (
              <MotiView
                key="rule-sets"
                from={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full"
              >
                <ScrollView className="h-[calc(100vh-130px)]">
                  <View className="mr-2 grid grid-cols-1 gap-6 pb-12 md:grid-cols-2">
                    {!!error && status !== "pending" && (
                      <View className="mx-2 max-w-5xl flex-1">
                        <ErrorBox error={error} retry={refetch} />
                      </View>
                    )}
                    {!ruleSets && !error && (
                      <View className="flex w-full flex-row items-center justify-center">
                        <Loading className="size-12 text-[#ff4a25]" />
                      </View>
                    )}
                    {ruleSets.map((ruleSet) => (
                      <View
                        key={ruleSet.id}
                        className={cn(
                          "border-[3px] border-black rounded-2xl p-4 dark:border-gray-700",
                        )}
                      >
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center gap-3">
                            <View className="text-gray-400 dark:text-gray-500">
                              {ruleSet.isSystem ? (
                                <Settings className="size-5" />
                              ) : (
                                <User className="size-5" />
                              )}
                            </View>
                            <View className="flex-row items-center gap-2">
                              <Text className="font-medium dark:text-gray-200">
                                {ruleSet.name}
                              </Text>
                            </View>
                          </View>
                          <View className="flex-row gap-2">
                            <Pressable
                              role="button"
                              onPress={() => {
                                gotoNewScreen({
                                  rule: JSON.stringify(ruleSet.id),
                                });
                              }}
                              className={cn(
                                "text-gray-400 dark:text-gray-500 h-12 w-12 flex-row items-center justify-center rounded-xl border-[3px] transition-colors",
                                {
                                  "border-[#FF5937] bg-[#FF5937] text-white":
                                    ruleSet.id === selectedId,
                                  "border-gray-200 hover:border-gray-300 dark:border-gray-700":
                                    ruleSet.id !== selectedId,
                                },
                              )}
                            >
                              <Check className="size-5" />
                            </Pressable>
                            <ActionDialog
                              ruleSet={ruleSet}
                              onDuplicate={() => duplicateRuleSet(ruleSet)}
                              onDelete={() => {
                                if (selectedId === ruleSet.id) {
                                  setSelectedId(ruleSets[0].id);
                                }
                                ruleSetDelete(ruleSet.id);
                              }}
                            >
                              <Pressable
                                role="button"
                                className="size-12 flex-row items-center justify-center rounded-xl border-[3px] border-gray-200 text-gray-400 transition-colors hover:border-gray-300 dark:border-gray-700 dark:text-gray-500"
                              >
                                <MoreVertical className="size-5" />
                              </Pressable>
                            </ActionDialog>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </MotiView>
            )}
          </AnimatePresence>
        </View>
      </View>
    </ScreenFrame>
  );
}
