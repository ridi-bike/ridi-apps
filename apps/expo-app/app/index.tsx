import { Text, View } from "react-native";
import { Memo, Show } from "@legendapp/state/react";
import Auth from "~/components/Auth";
import { session$ } from "~/lib/stores";
import { Link } from "@react-navigation/native";

export default function Index() {
	return (
		<View className="flex-1 h-full w-full">
			<View className="h-24 w-full justify-between flex-row">
				<Show if={session$.initialized}>
					<Text>
						<Memo>{session$.session.user.id}</Memo>
					</Text>
				</Show>
				<Auth />
			</View>
			<Link to={"/plans/new"}>new new new</Link>
		</View>
	);
}
