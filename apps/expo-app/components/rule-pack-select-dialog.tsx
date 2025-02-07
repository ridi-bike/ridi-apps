import { useRouter } from "expo-router";
import { CirclePlus, Cog, SquarePlus, UserPen } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View, Text } from "react-native";
import { generate } from "xksuid";

import { Button } from "~/components/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { useStoreRulePacks } from "~/lib/stores/rules-store";

export function RulePackSelectDialog({
  children,
  title,
  setRoutePackId,
}: {
  children: React.ReactNode;
  title: string;
  setRoutePackId: (id: string) => void;
}) {
  const router = useRouter();
  const { data: rulePacks, rulePackSet } = useStoreRulePacks();
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
            <Text>{title}</Text>
            <Pressable
              className="mx-2"
              onPress={() => {
                rulePackSet({
                  id: generate(),
                  name: `Custom rules ${rulePacks.filter((rp) => !rp.system).length + 1}`,
                  roadTags: rulePacks[0]!.roadTags,
                });
              }}
            >
              <CirclePlus className="size-6" />
            </Pressable>
          </AlertDialogTitle>
          <AlertDialogDescription>
            {rulePacks.map((rulePack) => (
              <View
                key={rulePack.id}
                className="my-2 flex w-full flex-row items-center justify-between gap-6"
              >
                <Button
                  className="flex flex-1 flex-row items-center justify-start gap-2"
                  variant="primary"
                  onPress={() => {
                    setRoutePackId(rulePack.id);
                    setOpen(false);
                  }}
                >
                  {rulePack.system && (
                    <Cog className="size-4 dark:text-gray-200" />
                  )}
                  {!rulePack.system && (
                    <UserPen className="size-4 dark:text-gray-200" />
                  )}
                  <Text>{rulePack.name}</Text>
                </Button>
                <Button
                  className="h-full w-24"
                  variant="secondary"
                  onPress={() => {
                    setOpen(false);
                    router.navigate(`/rules/${rulePack.id}`);
                  }}
                >
                  <Text className="dark:text-gray-200">
                    {rulePack.system ? "View" : "Edit"}
                  </Text>
                </Button>
              </View>
            ))}
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
