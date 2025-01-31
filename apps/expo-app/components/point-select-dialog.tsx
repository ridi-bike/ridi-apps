import { MapPin } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View, Text } from "react-native";

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

import { type GeoMapMarkerProps } from "./geo-map/types";

export function PointSelectDialog({
  children,
  lat,
  lon,
  title,
  description,
  setStart,
  setFinish,
  unset,
}: GeoMapMarkerProps & {
  title: string;
  description: string;
  setStart?: () => void;
  setFinish?: () => void;
  unset?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={(open) => setOpen(open)}>
      <AlertDialogTrigger asChild>
        <Pressable>{children}</Pressable>
      </AlertDialogTrigger>
      <AlertDialogContent className="w-full border-black bg-white dark:border-gray-700 dark:bg-gray-800">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            <View className="flex flex-row items-start gap-2">
              <MapPin className="mt-1 size-4 text-[#FF5937]" />
              <View className="flex-1">
                <Text className="mb-1 text-sm font-medium dark:text-gray-100">
                  Address
                </Text>
                <Text className="break-words text-sm text-gray-600 dark:text-gray-200">
                  {description}
                </Text>
              </View>
            </View>
            <View className="flex flex-row items-start gap-2">
              <MapPin className="mt-1 size-4 text-[#FF5937]" />
              <View className="flex-1">
                <Text className="mb-1 font-medium dark:text-gray-100">
                  Coordinates
                </Text>
                <Text className="text-gray-600 dark:text-gray-200">
                  {lat.toFixed(4)}, {lon.toFixed(4)}
                </Text>
              </View>
            </View>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-col items-center justify-between gap-6">
          <View className="flex flex-row items-center justify-between gap-6">
            {!!unset && (
              <Button
                className="flex-1"
                variant="primary"
                onPress={() => {
                  unset();
                  setOpen(false);
                }}
              >
                <Text>Clear Point</Text>
              </Button>
            )}
            {!!setStart && (
              <Button
                className="flex-1"
                variant="primary"
                onPress={() => {
                  setStart();
                  setOpen(false);
                }}
              >
                <Text>{!setFinish ? "Set Start/Finish" : "Set Start"}</Text>
              </Button>
            )}
            {!!setFinish && (
              <Button
                className="flex-1"
                variant="primary"
                onPress={() => {
                  setFinish();
                  setOpen(false);
                }}
              >
                <Text>Set Finish</Text>
              </Button>
            )}
          </View>
          <Button
            variant="secondary"
            className="flex-1"
            onPress={() => setOpen(false)}
          >
            <Text>Cancel</Text>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
