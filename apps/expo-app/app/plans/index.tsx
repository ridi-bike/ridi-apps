import { Link } from "expo-router";
import { ScrollView } from "react-native";
import { buttonVariants } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { useStorePlans } from "~/lib/stores/plans-store";
import { cn } from "~/lib/utils";

export default function Plans() {
	const { data, error, status } = useStorePlans();
	return (
		<ScrollView className="flex-row h-full w-full justify-start items-start">
			<Link href={"/plans/new"}>new new</Link>
			<Link href={"/plans"}>list plans</Link>
			<Text>{status}</Text>
			<Text>{error?.name}</Text>
			{data.map((plan) => (
				<Link
					key={plan.id}
					className={cn(
						buttonVariants({
							variant: "link",
						}),
						"flex-row items-center justify-start",
					)}
					href={{
						pathname: "/plans/[planId]",
						params: {
							planId: plan.id,
						},
					}}
				>
					<Text>
						{plan.state}: {plan.id}: {plan.name}; {plan.fromLat},{plan.fromLon}{" "}
						- {plan.toLat},{plan.toLon}`
					</Text>
				</Link>
			))}
		</ScrollView>
	);
}
