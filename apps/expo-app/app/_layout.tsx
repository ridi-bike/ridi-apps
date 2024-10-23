import { Stack } from "expo-router";
import { PortalHost } from "@rn-primitives/portal";
import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { queryClient, supabaseTrpcClient, trpc } from "~/lib/supabase";

export function App() {
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
