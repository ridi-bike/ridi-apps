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
      <View role="article" className="w-full bg-white rounded-2xl shadow-lg border-2 border-black p-6">
        <View
          className="h-[240px] mb-6 rounded-xl overflow-hidden border-2 border-black"
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
          <View className="flex items-start gap-3">
            <MapPin className="w-6 h-6 mt-1 text-[#FF5937]" />
            <View>
              <Text role="heading" aria-level={2} className="text-sm font-bold text-[#FF5937]">Start</Text>
              <Text className="text-base font-medium">{startAddress}</Text>
            </View>
          </View>
          <View className="flex items-start gap-3">
            <Navigation className="w-6 h-6 mt-1 text-[#FF5937]" />
            <View>
              <Text role="heading" aria-level={2} className="text-sm font-bold text-[#FF5937]">End</Text>
              <Text className="text-base font-medium">{endAddress}</Text>
            </View>
          </View>
          <View className="text-base pt-4 border-t-2 border-black">
            <Text className="font-bold">Straigt line distance: </Text>
            <Text className="font-medium">{distance}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};
