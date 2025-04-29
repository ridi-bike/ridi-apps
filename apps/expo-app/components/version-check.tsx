import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Text } from "react-native";
import { throttle } from "throttle-debounce";

import { Button } from "./button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

const currentVersion: { version: number | null } = { version: null };

export function VersionCheck() {
  const [open, setOpen] = useState(false);

  const doVersionCheck = useMemo(
    () =>
      throttle(60 * 1000, async (updateVersion: (val: number) => void) => {
        const versionResp = await fetch("/version.json", {
          cache: "no-store",
        });
        const newVersion = await versionResp.json();

        if (!currentVersion.version) {
          updateVersion(newVersion.version);
        } else if (currentVersion.version !== newVersion.version) {
          setOpen(true);
        }
      }),
    [],
  );

  const searchParams = useLocalSearchParams();

  useEffect(() => {
    doVersionCheck((val) => (currentVersion.version = val));
  }, [doVersionCheck, searchParams]);

  useFocusEffect(
    useCallback(() => {
      doVersionCheck((val) => (currentVersion.version = val));
    }, [doVersionCheck]),
  );

  return (
    <AlertDialog className="w-full" open={open}>
      <AlertDialogContent className="w-full border-black bg-white dark:border-gray-700 dark:bg-gray-800">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex flex-row items-center justify-between dark:text-gray-100">
            New Ridi App version available
          </AlertDialogTitle>
          <AlertDialogDescription>
            <Text className="dark:text-gray-200">
              The app will refresh to give you the latest features and fixes
            </Text>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex w-full flex-col items-center justify-between">
          <Button
            variant="primary"
            className="flex w-full flex-row items-center justify-center"
            onPress={() => {
              location.reload();
            }}
          >
            <Text className="dark:text-gray-200">OK</Text>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
