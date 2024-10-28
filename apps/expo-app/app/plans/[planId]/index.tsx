import { For } from "@legendapp/state/react";
import { useLocalSearchParams } from "expo-router";
import { Link } from "expo-router";
import { ScrollView } from "react-native";
import { buttonVariants } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { plans$ } from "~/lib/stores";
import { cn } from "~/lib/utils";

export default function PlanRoutes() {
	const { planId } = useLocalSearchParams<{ planId: string }>();
	return (
		<ScrollView className="flex-col h-full w-full">
			<For each={plans$.plans.find((t) => t.id.get() === planId)?.routes}>
				{(route$) => (
					<Link
						className={cn(
							buttonVariants({
								variant: "link",
							}),
						)}
						href={`/plans/${planId}/${route$.id}`}
					>
						<Text>{`${route$.created_at}: ${route$.name}`}</Text>
					</Link>
				)}
			</For>
		</ScrollView>
	);
}
