import { Text, View } from "react-native";

import Auth from "~/components/Auth";
import { useEffect, useState } from "react";
import { supabase } from "~/lib/supabase";
import type { Session } from "@supabase/supabase-js";

export default function Index() {
	const [session, setSession] = useState<Session | null>(null);

	useEffect(() => {
		supabase.auth.getSession().then(({ data: { session } }) => {
			setSession(session);
		});

		supabase.auth.onAuthStateChange((_event, session) => {
			setSession(session);
		});
	}, []);
	return (
		<View
			style={{
				flex: 1,
				justifyContent: "center",
				alignItems: "center",
			}}
		>
			<Text>Edit app/index.tsx to edit this screen.</Text>
			{session?.user && <Text>{session.user.id}</Text>}
			<Auth />
		</View>
	);
}
