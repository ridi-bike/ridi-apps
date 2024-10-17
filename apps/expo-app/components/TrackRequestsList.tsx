import { observe } from "@legendapp/state";
import { generate } from "xksuid";
import { SafeAreaView, SectionList, StatusBar } from "react-native";
import { tracks$ } from "~/lib/stores";
import { Text } from "./ui/text";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { observer } from "@legendapp/state/react";

export const TrackRequestsList = observer(() => {
	return (
		<SafeAreaView
			className="m-2"
			style={{
				flex: 1,
				paddingTop: StatusBar.currentHeight,
				marginHorizontal: 16,
			}}
		>
			<Button
				className="w-24 h-8 bg-blue-300 text-red-400"
				onPress={() =>
					tracks$.trackRequests.set(
						tracks$.trackRequests.concat([
							{
								from_lat: Math.random(),
								from_lon: Math.random(),
								to_lat: Math.random(),
								to_lon: Math.random(),
								name: `omg${Math.random().toString()}`,
								id: generate(),
								status: "new",
								created_at: "now()",
								user_id: "",
								modified_at: null,
							},
						]),
					)
				}
			>
				<Text>
					New
				</Text>
			</Button>
			<SectionList
				sections={[
					{ title: "track requests", data: tracks$.trackRequests.get() },
				]}
				keyExtractor={(item, index) => item.id}
				renderItem={({ item }) => (
					<Card className="w-full max-w-sm">
						<CardHeader>
							<CardTitle>{item.name}</CardTitle>
							<CardDescription>{`${item.from_lat}, ${item.from_lon} - ${item.to_lat}, ${item.to_lon}`}</CardDescription>
						</CardHeader>
						<CardContent>
							<Text>Card Content</Text>
						</CardContent>
						<CardFooter>
							<Text>{item.status}</Text>
						</CardFooter>
					</Card>
				)}
				renderSectionHeader={({ section: { title } }) => (
					<Text className="text-red-400">{title}</Text>
				)}
			/>
		</SafeAreaView>
	);
});
