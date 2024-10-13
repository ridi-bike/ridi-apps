import { Text, View } from "react-native";

import Auth from "~/components/Auth";
import { useEffect, useState } from "react";
import { supabase, supabaseTrpcClient } from "~/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import { Button } from "~/components/ui/button";

export default function Index() {
	const [session, setSession] = useState<Session | null>(null);
	const [apiTest, setApiTest] = useState<string>("");
	useEffect(() => {
		supabase.auth.getSession().then(({ data: { session } }) => {
			setSession(session);
		});

		supabase.auth.onAuthStateChange((_event, session) => {
			setSession(session);
		});
	}, []);
	const [posts, setPosts] = useState<{ id: string; title: string }[]>([]);
	useEffect(() => {
		supabaseTrpcClient.posts.list().then((posts) => setPosts(posts));
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
			{session?.user && (
				<>
					<Text />
					<Button
						className="bg-gray-200"
						onPress={() => {
							setApiTest("loading......");
							// 	supabase.functions
							// 		.invoke("test-comms", {
							// 			body: {
							// 				payload: "omg omg from expo",
							// 			},
							// 		})
							// 		.then((resp) => {
							// 			return resp.data || resp.error;
							// 		})
							// 		.then((j) => setApiTest(JSON.stringify(j)));
							// }}
							supabase
								.from("realtime_tests")
								.insert({
									user_id: session.user.id,
								})
								.then(() => setApiTest("done"));
						}}
					>
						test apis and router
					</Button>
					<Text className="w-64">{apiTest}</Text>
				</>
			)}
		</View>
	);
}
