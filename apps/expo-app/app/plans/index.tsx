import { For } from "@legendapp/state/react";
import { Link } from "expo-router";
import { ScrollView } from "react-native";
import { buttonVariants } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { plans$ } from "~/lib/stores";
import { cn } from "~/lib/utils";

export default function Plans() {
	return (
		<ScrollView className="flex-col h-full w-full">
			<For each={plans$.plans}>
				{(plan$) => (
					<Link
						className={cn(
							buttonVariants({
								variant: "link",
							}),
						)}
						href={`/plans/${plan$.id}`}
					>
						<Text>{`${plan$.created_at}: ${plan$.name}; ${plan$.from_lat},${plan$.from_lon}-${plan$.to_lat},${plan$.to_lon}`}</Text>
					</Link>
				)}
			</For>
		</ScrollView>
	);
}
