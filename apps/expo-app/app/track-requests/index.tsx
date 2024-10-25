import { For } from "@legendapp/state/react";
import { Link } from "expo-router";
import { ScrollView } from "react-native";
import { buttonVariants } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { tracks$ } from "~/lib/stores";
import { cn } from "~/lib/utils";

export default function TrackRequests() {
	return (
		<ScrollView className="flex-col">
			<For each={tracks$.trackRequests}>
				{(trackReq$) => (
					<Link
						className={cn(
							buttonVariants({
								variant: "link",
							}),
						)}
						href={`/track-requests/${trackReq$.id}`}
					>
						<Text>{`${trackReq$.created_at}: ${trackReq$.name}; ${trackReq$.from_lat},${trackReq$.from_lon}-${trackReq$.to_lat},${trackReq$.to_lon}`}</Text>
					</Link>
				)}
			</For>
		</ScrollView>
	);
}
