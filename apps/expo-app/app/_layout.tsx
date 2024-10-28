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

export function App() {
	useMount(() => {
		supabase.auth.getSession().then(({ data: { session } }) =>
			session$.set({
				initialized: true,
				session,
			}),
		);
		supabase.auth.onAuthStateChange((_event, session) =>
			session$.session.set(session),
		);
	});
	return (
		<trpc.Provider client={supabaseTrpcClient} queryClient={queryClient}>
			<QueryClientProvider client={queryClient}>
				<Stack>
					<Stack.Screen name="index" />
				</Stack>
				<PortalHost />
			</QueryClientProvider>
		</trpc.Provider>
	);
}
