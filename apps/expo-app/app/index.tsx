import { Text, View } from "react-native";
import { useStore } from "@nanostores/react";
import Auth from "~/components/Auth";
import { $session } from "~/lib/stores/session-store";
import { Link } from "expo-router";
import { Button } from "~/components/button";
import { useRouter, useFocusEffect } from 'expo-router';

export default function Index() {
	const session = useStore($session);
	const router = useRouter();

	useFocusEffect(() => {
		if (session && !session.user.is_anonymous) {
			router.replace('/plans');
		}
	});

	return (
		<View className="min-h-screen w-full bg-white flex flex-col justify-center items-center p-6">
			<View className="w-full max-w-[375px] flex flex-col items-center">
				<View className="mb-16">
					<h1 className="text-6xl font-bold tracking-tight text-[#FF5937]">
						Ridi
					</h1>
				</View>
				<View className="w-full space-y-4">
					<View className="flex-1 h-full w-full">
						<View className="h-24 w-full justify-between flex-row">
							{session && <Text>{session.user.id}</Text>}
							<Auth />
						</View>
						<Link href={"/plans/new"}>new new</Link>
						<Link href={"/plans"}>list plans</Link>
					</View>
					{!session &&
						<View className="relative w-12 h-12">
							<View className="absolute w-full h-full border-4 border-[#FF5937] rounded-full animate-pulse opacity-20"></View>
							<View className="absolute w-full h-full border-4 border-[#FF5937] rounded-full animate-spin border-t-transparent"></View>
						</View>
					}
				</View>
			</View>
		</View >
	);
}
