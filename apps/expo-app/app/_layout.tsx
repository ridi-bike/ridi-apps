import { Stack } from "expo-router";
import { PortalHost } from "@rn-primitives/portal";
import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
	queryClient,
	supabase,
	supabaseTrpcClient,
	trpc,
} from "~/lib/supabase";
import { useMount } from "@legendapp/state/react";
import { session$ } from "~/lib/stores";

export default function App() {
	console.log("app running yeah");
	useMount(async () => {
		console.log("omg wtf lets mount");
		supabase.auth.onAuthStateChange((_event, session) => {
			session$.set(session);
			console.log("auth changed");
		});

		const sessionData = await supabase.auth.getSession();
		const session = sessionData.data.session;

		if (session) {
			session$.set(session);
		} else {
			supabase.auth.signInAnonymously();
		}
	});

	return (
		<>
			<Stack>
				<Stack.Screen name="index" />
			</Stack>
			<PortalHost />
		</>
	);
}
