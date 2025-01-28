import { useLocalSearchParams , Link } from "expo-router";
import { useMemo } from "react";
import { ScrollView } from "react-native";

import { buttonVariants } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { useStorePlans } from "~/lib/stores/plans-store";
import { cn } from "~/lib/utils";

export default function PlanRoutes() {
	const { planId } = useLocalSearchParams<{ planId: string }>();
	const { data, error, status } = useStorePlans();

	const plan = useMemo(() => data.find((p) => p.id === planId), [data, planId]);

	return (
		<ScrollView className="size-full flex-col">
			<Text>{status}</Text>
			<Text>{error?.message}</Text>
			<Text>{plan?.id || "not found"}</Text>
			{plan?.routes.map((route) => (
				<Link
					key={route.routeId}
					className={cn(
						buttonVariants({
							variant: "link",
						}),
					)}
					href={{
						pathname: "/plans/[planId]/[routeId]",
						params: {
							planId,
							routeId: route.routeId,
						},
					}}
				>
					<Text>{`${route.routeCreatedAt}: ${route.routeName}`}</Text>
				</Link>
			))}
		</ScrollView>
	);
}
