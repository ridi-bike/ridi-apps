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
	const [posts, setPosts] = useState<{ id: number; title: string }[]>([]);
	useEffect(() => {
		if (session) {
			supabaseTrpcClient.hello.query().then(console.log);
			supabaseTrpcClient.post.listPosts
				.query()
				.then((posts) => setPosts(posts));
		}
	}, [session]);
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
					{posts.map((p) => (
						<Text key={p.id}>
							{p.id}:{p.title}
						</Text>
					))}
					<Button
						className="bg-gray-200"
						onPress={() => {
							setApiTest("loading......");
							supabaseTrpcClient.post.createPost.mutate({
								title: Math.random.toString(),
							});
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
