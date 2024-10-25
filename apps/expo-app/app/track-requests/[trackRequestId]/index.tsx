import { For } from "@legendapp/state/react";
import { useLocalSearchParams } from "expo-router";
import { Link } from "expo-router";
import { ScrollView } from "react-native";
import { buttonVariants } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { tracks$ } from "~/lib/stores";
import { cn } from "~/lib/utils";

export default function TrackRequests() {
	const { trackRequestId } = useLocalSearchParams<{ trackRequestId: string }>();
	return (
		<ScrollView className="flex-col">
			<For
				each={
					tracks$.trackRequests.find((t) => t.id.get() === trackRequestId)
						?.tracks
				}
			>
				{(track$) => (
					<Link
						className={cn(
							buttonVariants({
								variant: "link",
							}),
						)}
						href={`/track-requests/${trackRequestId}/${track$.id}`}
					>
						<Text>{`${track$.created_at}: ${track$.name}`}</Text>
					</Link>
				)}
			</For>
		</ScrollView>
	);
}
