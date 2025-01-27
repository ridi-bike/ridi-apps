import { View, Text, ScrollView } from "react-native";
import { CirclePauseIcon, CirclePlayIcon, MapPin, Navigation } from "lucide-react-native";
import { GeoMapStatic } from "./geo-map/geo-map-static";

interface RouteCardProps {
  startAddress: string;
  endAddress: string;
  distance: string;
  startCoords: [number, number];
  finishCoords: [number, number];
}

export const RouteCard = ({
  startAddress,
  endAddress,
  distance,
  startCoords,
  finishCoords,
}: RouteCardProps) => {

  return (
    <ScrollView className="w-full h-full">
      <View role="article" className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg border-2 border-black dark:border-gray-700 p-6">
        <View
          className="h-[240px] mb-6 rounded-xl overflow-hidden border-2 border-black dark:border-gray-700"
        >
          <GeoMapStatic points={[{
            icon:
              <CirclePlayIcon className="h-8 w-8 text-green-500" />
            , coords: startCoords
          }, {
            icon: <CirclePauseIcon className="h-8 w-8 text-red-500" />
            , coords: finishCoords
          }]} />

        </View>
        <View className="space-y-4">
          <View className="flex flex-row items-start gap-3">
            <MapPin className="w-6 h-6 mt-1 text-[#FF5937]" />
            <View>
              <Text role="heading" aria-level={2} className="text-sm font-bold text-[#FF5937]">Start</Text>
              <Text className="text-base font-medium dark:text-gray-200">{startAddress}</Text>
            </View>
          </View>
          <View className="flex flex-row items-start gap-3">
            <Navigation className="w-6 h-6 mt-1 text-[#FF5937]" />
            <View>
              <Text role="heading" aria-level={2} className="text-sm font-bold text-[#FF5937]">End</Text>
              <Text className="text-base font-medium dark:text-gray-200">{endAddress}</Text>
            </View>
          </View>
          <View className="text-base pt-4 border-t-2 border-black dark:border-gray-700 flex flex-row">
            <Text className="font-bold dark:text-gray-100">Straigt line distance: </Text>
            <Text className="font-medium dark:text-gray-200">{distance}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};
