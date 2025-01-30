import { Pressable, View } from "react-native";
import { Text } from "~/components/ui/text";

import GeoMapMarker from "./geo-map-marker";
import { type GeoMapMarkerProps } from "./types";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { MapPin } from "lucide-react-native";
import { Button } from "../button";
import { useState } from "react";
export function MapMarker({
  children,
  lat,
  lon,
  title,
  description,
  setStart,
  setFinish,
  unset
}: GeoMapMarkerProps & {
  title: string;
  description: string;
  setStart?: () => void,
  setFinish?: () => void,
  unset?: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <GeoMapMarker lat={lat} lon={lon}>
      <AlertDialog open={open} onOpenChange={(open) => setOpen(open)}>
        <AlertDialogTrigger asChild>
          <Pressable className="size-12 rounded-3xl hover:bg-[#FF5937]/80">
            {children}
          </Pressable>
        </AlertDialogTrigger>
        <AlertDialogContent className="bg-white dark:bg-gray-800 w-full border-black dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>
              <View className="flex flex-row items-start gap-2">
                <MapPin className="mt-1 size-4 text-[#FF5937]" />
                <View className="flex-1">
                  <Text className="mb-1 text-sm font-medium dark:text-gray-100">Address</Text>
                  <Text className="break-words text-sm text-gray-600 dark:text-gray-200">
                    {description}
                  </Text>
                </View>
              </View>
              <View className="flex flex-row items-start gap-2">
                <MapPin className="mt-1 size-4 text-[#FF5937]" />
                <View className="flex-1">
                  <Text className="mb-1 font-medium dark:text-gray-100">Coordinates</Text>
                  <Text className="text-gray-600 dark:text-gray-200">
                    {lat.toFixed(4)}, {lon.toFixed(4)}
                  </Text>
                </View>
              </View>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col justify-between gap-6 items-centere">
            <View className="flex flex-row justify-between gap-6 items-center">
              {!!unset && <Button className="flex-1" variant="primary" onPress={() => {
                unset()
                setOpen(false)
              }}>Clear Point</Button>}
              {!!setStart && <Button className="flex-1" variant="primary" onPress={() => {
                setStart()
                setOpen(false)
              }}>{!setFinish ? "Set Start/Finish" : "Set Start"}</Button>}
              {!!setFinish && <Button className="flex-1" variant="primary" onPress={() => {
                setFinish()
                setOpen(false)
              }}>Set Finish</Button>}
            </View>
            <Button variant="secondary" className="flex-1" onPress={() => setOpen(false)}>Cancel</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </GeoMapMarker>
  );
}
