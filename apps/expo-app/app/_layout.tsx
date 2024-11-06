import { Stack } from "expo-router";
import { PortalHost } from "@rn-primitives/portal";
import { supabase } from "~/lib/supabase";
import { $session } from "~/lib/stores/session-store";
import { useEffectOnce } from "~/lib/utils";

async function syncSession() {
	console.log("omg wtf lets mount");
	supabase.auth.onAuthStateChange((_event, session) => {
		$session.set(session);
		console.log("auth changed");
	});

	const sessionData = await supabase.auth.getSession();
	const session = sessionData.data.session;

	if (session) {
		$session.set(session);
	} else {
		supabase.auth.signInAnonymously();
	}
}

export default function App() {
	console.log("app running yeah");

	useEffectOnce(() => {
		syncSession();
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
