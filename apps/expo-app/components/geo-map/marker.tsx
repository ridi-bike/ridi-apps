import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "~/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "~/components/ui/popover";
import { Text } from "~/components/ui/text";
import GeoMapMarker from "./geo-map-marker";
import type { GeoMapMarkerProps } from "./types";

export function MapMarker({
	children,
	lat,
	lon,
	title,
	description,
	actions,
}: GeoMapMarkerProps & {
	title: string;
	description: string;
	actions?: React.ReactNode;
}) {
	const insets = useSafeAreaInsets();
	const contentInsets = {
		top: insets.top,
		bottom: insets.bottom,
		left: 12,
		right: 12,
	};

	return (
		<GeoMapMarker lat={lat} lon={lon}>
			<Popover>
				<PopoverTrigger asChild>
					<Button variant="ghost" className="rounded-3xl h-12 w-12">
						{children}
					</Button>
				</PopoverTrigger>
				<PopoverContent
					side={Platform.OS === "web" ? "bottom" : "top"}
					insets={contentInsets}
					className="w-80"
				>
					<Text className="font-medium leading-none native:text-xl">
						{title}
					</Text>
					<Text className="text-sm text-muted-foreground">{description}</Text>
					<View className="flex flex-row justify-between items-center">
						{actions}
					</View>
				</PopoverContent>
			</Popover>
		</GeoMapMarker>
	);
}
