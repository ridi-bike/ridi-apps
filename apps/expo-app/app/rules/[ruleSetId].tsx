import { Slider } from "@miblanchard/react-native-slider";
import {
  roadSmoothnessKeys,
  roadSurfacePavedKeys,
  roadSurfaceSpecialKeys,
  roadSurfaceUnpavedKeys,
  roadTypeLargeKeys,
  roadTypeMedKeys,
  roadTypeResidentalKeys,
  roadTypeSmallKeys,
  roadTypeTinyKeys,
} from "@ridi/api-contracts";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import {
  ChevronDown,
  ChevronUp,
  CircleHelp,
  RotateCcw,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView } from "react-native";

import { ScreenCard } from "~/components/screen-card";
import { ScreenFrame } from "~/components/screen-frame";
import { useStoreRuleSets } from "~/lib/stores/rules-store";
import { cn } from "~/lib/utils";

const ruleGroups = [
  ["Large Roads", roadTypeLargeKeys, "highway"],
  ["Medium Roads", roadTypeMedKeys, "highway"],
  ["Small Roads", roadTypeSmallKeys, "highway"],
  ["Residential Roads", roadTypeResidentalKeys, "highway"],
  ["Tiny Roads", roadTypeTinyKeys, "highway"],
  ["Paved Surface", roadSurfacePavedKeys, "surface"],
  ["Unpaved Surface", roadSurfaceUnpavedKeys, "surface"],
  ["Special Surface", roadSurfaceSpecialKeys, "surface"],
  ["Smoothness", roadSmoothnessKeys, "smoothness"],
] as const;

const tagValueToTagName = new Map<string, string>();
function addTagValues<T extends readonly string[]>(vals: T, tagName: string) {
  vals.forEach((v) => tagValueToTagName.set(v, tagName));
}
addTagValues(roadTypeLargeKeys, "highway");
addTagValues(roadTypeMedKeys, "highway");
addTagValues(roadTypeSmallKeys, "highway");
addTagValues(roadTypeResidentalKeys, "highway");
addTagValues(roadTypeTinyKeys, "highway");
addTagValues(roadSurfacePavedKeys, "surface");
addTagValues(roadSurfaceUnpavedKeys, "surface");
addTagValues(roadSurfaceSpecialKeys, "surface");
addTagValues(roadSmoothnessKeys, "smoothness");

function roadTagsDefined<T>(v: T | undefined): asserts v is T {
  if (!v) {
    throw new Error("road tag must not be undefined");
  }
}

export default function RulePackDetails() {
  const router = useRouter();
  const { ruleSetId } = useLocalSearchParams();
  const { data: ruleSets, error, ruleSetSet, status } = useStoreRuleSets();
  const ruleSet = ruleSets?.find((rp) => rp.id === ruleSetId);
  const [roadTags, setRoadTags] = useState(ruleSet?.roadTags);
  const [groupsExpanded, setGroupsExpanded] = useState<number[]>([]);
  const [ruleSetName, setRuleSetName] = useState(ruleSet?.name);

  useEffect(() => {
    if (ruleSet && !roadTags) {
      setRoadTags(ruleSet.roadTags);
      setRuleSetName(ruleSet.name);
    }
  }, [roadTags, ruleSet]);

  const toggleGroupExpanded = useCallback((groupIdx: number) => {
    setGroupsExpanded((ge) =>
      ge.includes(groupIdx)
        ? ge.filter((g) => g !== groupIdx)
        : [...ge, groupIdx],
    );
  }, []);

  const isGroupEnabled = useCallback(
    (group: (typeof ruleGroups)[number]) => {
      roadTagsDefined(roadTags);
      return Object.entries(roadTags)
        .filter((tags) => (group[1] as readonly string[]).includes(tags[0]))
        .some((tag) => tag[1] !== null);
    },
    [roadTags],
  );

  const getGroupTags = useCallback(
    (group: (typeof ruleGroups)[number]) => {
      roadTagsDefined(roadTags);
      return (
        Object.entries(roadTags) as [keyof typeof roadTags, number | null][]
      ).filter((tags) => (group[1] as readonly string[]).includes(tags[0]));
    },
    [roadTags],
  );

  const isGroupInSync = useCallback(
    (group: (typeof ruleGroups)[number]) => {
      roadTagsDefined(roadTags);
      return (
        new Set(
          Object.entries(roadTags)
            .filter((tags) => (group[1] as readonly string[]).includes(tags[0]))
            .map((tag) => tag[1]),
        ).size === 1
      );
    },
    [roadTags],
  );

  const toggleGroup = useCallback(
    (group: (typeof ruleGroups)[number]) => {
      const souldDisable = isGroupEnabled(group);
      if (souldDisable) {
        setRoadTags((rt) => ({
          ...rt!,
          ...getGroupTags(group).reduce(
            (all, curr) => ({ ...all, [curr[0]]: null }),
            {},
          ),
        }));
      } else {
        setRoadTags((rt) => ({
          ...rt!,
          ...getGroupTags(group).reduce(
            (all, curr) => ({ ...all, [curr[0]]: 0 }),
            {},
          ),
        }));
      }
    },
    [getGroupTags, isGroupEnabled],
  );

  const setGroupValue = useCallback(
    (group: (typeof ruleGroups)[number], value: number) => {
      setRoadTags((rt) => ({
        ...rt!,
        ...getGroupTags(group).reduce(
          (all, curr) => ({ ...all, [curr[0]]: value }),
          {},
        ),
      }));
    },
    [getGroupTags],
  );

  const setTagValue = useCallback(
    (
      tag: [keyof NonNullable<typeof roadTags>, number | null],
      value: number,
    ) => {
      setRoadTags((rt) => ({
        ...rt!,
        [tag[0]]: value,
      }));
    },
    [],
  );

  const toggleTag = useCallback(
    (tag: [keyof NonNullable<typeof roadTags>, number | null]) => {
      setRoadTags((rt) => ({
        ...rt!,
        [tag[0]]: rt![tag[0]] === null ? 0 : null,
      }));
    },
    [],
  );

  const unsavedChangesExist = useMemo(() => {
    if (!ruleSet || !roadTags) {
      return false;
    }
    const serverEntries = Object.entries(ruleSet.roadTags);
    const localEntries = Object.entries(roadTags);
    return (
      serverEntries.some(
        (se) => localEntries.find((le) => le[0] === se[0])![1] !== se[1],
      ) || ruleSetName !== ruleSet.name
    );
  }, [roadTags, ruleSet, ruleSetName]);

  if (!ruleSet || !roadTags) {
    return (
      <ScreenFrame title="Plan routes">
        <View className="mx-2 max-w-5xl flex-1">
          <ScreenCard
            middle={
              <View className="flex w-full flex-row items-center justify-center">
                <Text className="dark:text-gray-200">
                  Rules with id
                  <Text className="px-2 text-gray-500">{ruleSetId}</Text> is not
                  found
                </Text>
              </View>
            }
          />
        </View>
      </ScreenFrame>
    );
  }

  return (
    <ScreenFrame
      title="Routing rules"
      onGoBack={() =>
        router.canGoBack() ? router.back() : router.replace("/rules")
      }
      floating={
        !ruleSet.isSystem && (
          <View className="fixed bottom-0 w-full bg-white p-4 dark:bg-gray-800">
            <Pressable
              onPress={() => {
                if (unsavedChangesExist) {
                  ruleSetSet({
                    ...ruleSet,
                    name: ruleSetName || "",
                    roadTags: roadTags!,
                  });
                }
              }}
              aria-disabled={!unsavedChangesExist}
              className={cn(
                "w-full rounded-xl px-4 py-3 font-medium text-white transition-colors",
                {
                  "bg-[#FF5937] hover:bg-[#FF5937]/90": unsavedChangesExist,
                  "cursor-not-allowed bg-gray-200 dark:bg-gray-700":
                    !unsavedChangesExist,
                },
              )}
            >
              <Text className="text-center text-white">Save</Text>
            </Pressable>
          </View>
        )
      }
    >
      <View className="mx-2 max-w-5xl flex-1">
        <View className="flex flex-col gap-6 pb-12">
          <View
            className={cn(
              "border-black dark:border-gray-700 overflow-hidden rounded-2xl border-[3px]",
            )}
          >
            {ruleSet.isSystem && (
              <Text className="flex-1 rounded-xl border-2 border-black bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
                {ruleSetName}
              </Text>
            )}
            {!ruleSet.isSystem && (
              <TextInput
                value={ruleSetName}
                onChangeText={setRuleSetName}
                placeholder="Rule set name..."
                className="flex-1 rounded-xl border-2 border-black bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              />
            )}
          </View>
          <ScrollView className="h-[calc(100vh-130px)]">
            <View className="mr-2 flex flex-col gap-6 pb-12">
              {ruleGroups.map((group, groupIdx) => (
                <View
                  key={groupIdx}
                  className={cn("overflow-hidden rounded-2xl border-[3px]", {
                    "border-black dark:border-gray-700": isGroupEnabled(group),
                    "border-gray-200 dark:border-gray-700":
                      !isGroupEnabled(group),
                  })}
                >
                  <View className="space-y-4 p-4">
                    <View className="flex flex-row items-center justify-between gap-4">
                      <Text
                        className={cn("font-medium text-xl", {
                          "text-gray-400 dark:text-gray-200":
                            !isGroupEnabled(group),
                          "dark:text-gray-200": isGroupEnabled(group),
                        })}
                      >
                        {group[0]}
                      </Text>
                      <View className="flex flex-row items-center gap-2">
                        <Text className="dark:text-gray-200">Allowed:</Text>
                        <Pressable
                          className={cn(
                            "h-8 w-14 rounded-full p-1 transition-colors",
                            {
                              "bg-[#FF5937]": isGroupEnabled(group),
                              "bg-gray-200 dark:bg-gray-700":
                                !isGroupEnabled(group),
                            },
                          )}
                          onPress={() => toggleGroup(group)}
                        >
                          <View
                            className={cn(
                              "size-6 rounded-full bg-white transition-transform dark:bg-gray-900",
                              {
                                "translate-x-6": isGroupEnabled(group),
                              },
                            )}
                          />
                        </Pressable>
                        <Pressable
                          onPress={() => toggleGroupExpanded(groupIdx)}
                          className={cn(
                            "border-[3px] mx-4 flex flex-row justify-center items-center w-24 dark:border-gray-700 border-black text-[#FF5937] rounded-lg p-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800",
                            {
                              "text-gray-400 dark:text-gray-200":
                                !isGroupEnabled(group),
                            },
                          )}
                        >
                          {groupsExpanded.includes(groupIdx) ? (
                            <ChevronUp className="size-5" />
                          ) : (
                            <ChevronDown className="size-5" />
                          )}
                        </Pressable>
                      </View>
                    </View>
                    {isGroupEnabled(group) && (
                      <View className="space-y-2">
                        <View className="flex flex-row items-center justify-between">
                          <Text className="text-sm font-medium dark:text-gray-200">
                            Group Priority
                          </Text>
                        </View>
                        <View className="h-20 space-y-1">
                          {!isGroupInSync(group) && (
                            <Pressable
                              onPress={() => setGroupValue(group, 0)}
                              className="flex h-12 w-full flex-row items-center justify-center rounded-lg border border-black p-1 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                            >
                              <RotateCcw className="size-4 text-gray-500 dark:text-gray-400" />
                            </Pressable>
                          )}
                          {isGroupInSync(group) && (
                            <>
                              <View className="relative h-12 w-full">
                                <View className="absolute inset-0 flex flex-row items-center">
                                  <View className="h-2 w-full rounded-lg bg-gray-200 dark:bg-gray-700" />
                                </View>
                                <Slider
                                  renderThumbComponent={() => (
                                    <View className="size-12 rounded-lg border-2 border-[#FF5937] bg-[#FF5937]" />
                                  )}
                                  trackClickable={true}
                                  step={1}
                                  value={getGroupTags(group)[0][1] || 0}
                                  maximumValue={255}
                                  minimumValue={0}
                                  trackStyle={{
                                    backgroundColor: "transparent",
                                  }}
                                  minimumTrackStyle={{
                                    backgroundColor: "transparent",
                                  }}
                                  maximumTrackStyle={{
                                    backgroundColor: "transparent",
                                  }}
                                  onValueChange={(value) => {
                                    setGroupValue(group, value[0]);
                                  }}
                                />
                              </View>
                              <View className="flex flex-row justify-between px-1">
                                <Text className="text-xs text-gray-500 dark:text-gray-400">
                                  Low
                                </Text>
                                <Text className="text-xs text-gray-500 dark:text-gray-400">
                                  High
                                </Text>
                              </View>
                            </>
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                  {groupsExpanded.includes(groupIdx) && (
                    <View className="space-y-4 border-t-2 border-black p-4 dark:border-gray-700">
                      {getGroupTags(group).map((tag) => (
                        <View
                          key={tag[0]}
                          className="space-y-3 rounded-xl border-2 border-black p-4 dark:border-gray-700"
                        >
                          <View className="flex flex-row items-center justify-between gap-4">
                            <View className="flex flex-row items-center justify-start gap-2">
                              <Text className="flex-1 text-sm dark:text-gray-200">
                                {tag[0]}
                              </Text>
                              <Pressable
                                onPress={() => {
                                  WebBrowser.openBrowserAsync(
                                    `https://wiki.openstreetmap.org/wiki/Tag:${tagValueToTagName.get(tag[0])}%3D${tag[0]}`,
                                  );
                                }}
                              >
                                <CircleHelp className="size-6 text-[#FF5937]" />
                              </Pressable>
                            </View>
                            <Pressable
                              className={cn(
                                "h-8 w-14 rounded-full p-1 transition-colors",
                                {
                                  "bg-[#FF5937]": tag[1] !== null,
                                  "bg-gray-200 dark:bg-gray-700":
                                    tag[1] === null,
                                },
                              )}
                              onPress={() => toggleTag(tag)}
                            >
                              <View
                                className={cn(
                                  "size-6 rounded-full bg-white transition-transform dark:bg-gray-900",
                                  {
                                    "translate-x-6": tag[1] !== null,
                                  },
                                )}
                              />
                            </Pressable>
                          </View>
                          {tag[1] !== null && (
                            <View className="space-y-1">
                              <View className="relative h-12 w-full">
                                <View className="absolute inset-0 flex flex-row items-center">
                                  <View className="h-2 w-full rounded-lg bg-gray-200 dark:bg-gray-700" />
                                </View>
                                <Slider
                                  renderThumbComponent={() => (
                                    <View className="size-12 rounded-lg border-2 border-[#FF5937] bg-[#FF5937]" />
                                  )}
                                  trackClickable={true}
                                  step={1}
                                  value={tag[1] as number}
                                  maximumValue={255}
                                  minimumValue={0}
                                  trackStyle={{
                                    backgroundColor: "transparent",
                                  }}
                                  minimumTrackStyle={{
                                    backgroundColor: "transparent",
                                  }}
                                  maximumTrackStyle={{
                                    backgroundColor: "transparent",
                                  }}
                                  onValueChange={(value) =>
                                    setTagValue(tag, value[0])
                                  }
                                />
                              </View>
                              <View className="flex flex-row justify-between px-1">
                                <Text className="text-xs text-gray-500 dark:text-gray-400">
                                  Low
                                </Text>
                                <Text className="text-xs text-gray-500 dark:text-gray-400">
                                  High
                                </Text>
                              </View>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </ScreenFrame>
  );
}
