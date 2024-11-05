import { For, Memo } from "@legendapp/state/react";
import { useLocalSearchParams } from "expo-router";
import { Link } from "expo-router";
import { ScrollView } from "react-native";
import { buttonVariants } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { plans$ } from "~/lib/stores/plans-store";
import { cn } from "~/lib/utils";

export default function PlanRoutes() {
	const { planId } = useLocalSearchParams<{ planId: string }>();
	return (
		<ScrollView className="flex-col h-full w-full">
			<Text>
				<Memo>
					{() =>
						plans$.plans.find((p) => p.id.get() === planId)?.id.get() ||
						"not found"
					}
				</Memo>
			</Text>
			<For each={plans$.plans.find((t) => t.id.get() === planId)?.routes}>
				{(route$) => (
					<Link
						className={cn(
							buttonVariants({
								variant: "link",
							}),
						)}
						href={{
							pathname: "/plans/[planId]/[routeId]",
							params: {
								planId,
								routeId: route$.routeId.get(),
							},
						}}
					>
						<Text>{`${route$.routeCreatedAt.get()}: ${route$.routeName.get()}`}</Text>
					</Link>
				)}
			</For>
		</ScrollView>
	);
}
