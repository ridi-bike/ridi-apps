import { For, Memo } from "@legendapp/state/react";
import { Link } from "expo-router";
import { ScrollView } from "react-native";
import { buttonVariants } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { plans$ } from "~/lib/stores";
import { cn } from "~/lib/utils";

export default function Plans() {
	return (
		<ScrollView className="flex-row h-full w-full justify-start items-start">
			<Link href={"/plans/new"}>new new</Link>
			<Link href={"/plans"}>list plans</Link>
			<For each={plans$.plans}>
				{(plan$) => (
					<Link
						className={cn(
							buttonVariants({
								variant: "link",
							}),
							"flex-row items-center justify-start",
						)}
						href={{
							pathname: "/plans/[planId]",
							params: {
								planId: plan$.id.get(),
							},
						}}
					>
						<Memo>
							{() => (
								<Text>
									{plan$.state.get()}: {plan$.id.get()}: {plan$.name.get()};{" "}
									{plan$.fromLat.get()},{plan$.fromLon.get()} -{" "}
									{plan$.toLat.get()},{plan$.toLon.get()}`
								</Text>
							)}
						</Memo>
					</Link>
				)}
			</For>
		</ScrollView>
	);
}
