import React, { useState } from "react";
import { Alert, StyleSheet, View, Text } from "react-native";
import { supabase } from "../lib/supabase";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";

export default function Auth() {
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);

	async function signInWithEmail() {
		setLoading(true);
		const { error } = await supabase.auth.signInWithPassword({
			email: email,
			password: password,
		});

		if (error) Alert.alert(error.message);
		setLoading(false);
	}

	async function signUpWithEmail() {
		setLoading(true);
		const {
			data: { session },
			error,
		} = await supabase.auth.signUp({
			email: email,
			password: password,
		});

		if (error) Alert.alert(error.message);
		if (!session)
			Alert.alert("Please check your inbox for email verification!");
		setLoading(false);
	}

	async function signInWithGithub() {
		setLoading(true);
		const { data, error } = await supabase.auth.signInWithOAuth({
			provider: "github",
		});
		if (error) Alert.alert(error.message);
		setLoading(false);
	}

	return (
		<View className="">
			<View>
				<Label nativeID="email">Email</Label>
				<Input
					nativeID="email"
					onChangeText={(text) => setEmail(text)}
					value={email}
					placeholder="email@address.com"
					autoCapitalize={"none"}
				/>
			</View>
			<View>
				<Label nativeID="password">Password j</Label>
				<Input
					nativeID="password"
					onChangeText={(text) => setPassword(text)}
					value={password}
					secureTextEntry={true}
					placeholder="Password"
					autoCapitalize={"none"}
				/>
			</View>
			<View>
				<Button disabled={loading} onPress={() => signInWithEmail()}>
					<Text>Sign in</Text>
				</Button>
			</View>
			<View>
				<Button disabled={loading} onPress={() => signUpWithEmail()}>
					<Text>Sign up</Text>
				</Button>
			</View>

			<View>
				<Button
					className="bg-red-400 w-24 h-24"
					onPress={() => {
						console.log("stuff and things");
						signInWithGithub();
					}}
					variant="default"
					disabled={loading}
				>
					<Text className="text-green-700">GitHub xx</Text>
				</Button>
			</View>
		</View>
	);
}
