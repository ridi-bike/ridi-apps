import { Stack } from "expo-router";
import { PortalHost } from "@rn-primitives/portal";
import { supabase } from "~/lib/supabase";
import { $session } from "~/lib/stores/session-store";
import { useEffectOnce } from "~/lib/utils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { registerBackgroundFetchAsync } from "~/lib/background";

registerBackgroundFetchAsync();

async function syncSession() {
	supabase.auth.onAuthStateChange((_event, session) => {
		$session.set(session);
	});

	const sessionData = await supabase.auth.getSession();
	const session = sessionData.data.session;

	if (session) {
		$session.set(session);
	} else {
		supabase.auth.signInAnonymously();
	}
}

const queryClient = new QueryClient();

export default function App() {
	useEffectOnce(() => {
		syncSession();
	});

	return (
		<QueryClientProvider client={queryClient}>
			<Stack/>
			<PortalHost />
		</QueryClientProvider>
	);
}
