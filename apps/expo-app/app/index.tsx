import { useStore } from "@nanostores/react";
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { Text, View } from "react-native";

import Auth from "~/components/Auth";
import { $session } from "~/lib/stores/session-store";


export default function Index() {
	const session = useStore($session);
	const router = useRouter();

	useFocusEffect(() => {
		if (session && !session.user.is_anonymous) {
			router.replace('/plans');
		}
	});

	return (
		<View className="flex min-h-screen w-full flex-col items-center justify-center bg-white p-6">
			<Stack.Screen options={{ headerShown: false }} />
			<View className="flex w-full max-w-[375px] flex-col items-center">
				<View className="mb-16">
					<Text className="text-6xl font-bold tracking-tight text-[#FF5937]">
						Ridi
					</Text>
				</View>
				<View className="w-full space-y-4">
					{!session &&
						<View className="relative flex size-12 w-full justify-center">
							<View className="absolute size-full animate-pulse rounded-full border-4 border-[#FF5937] opacity-20"></View>
							<View className="absolute size-full animate-spin rounded-full border-4 border-[#FF5937] border-t-transparent"></View>
						</View>
					}
					<Auth />
				</View>
			</View>
		</View >
	);
}
