import { AppState } from "react-native";
import type { AppRouter } from "../../../supabase/functions/trpc/router";

import { createTRPCProxyClient, httpBatchLink, loggerLink } from "@trpc/client";
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error("Missing env variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
	auth: {
		storage: AsyncStorage,
		autoRefreshToken: true,
		persistSession: true,
		detectSessionInUrl: false,
	},
});

export const supabaseTrpcClient = createTRPCProxyClient<AppRouter>({
	links: [
		loggerLink(),
		httpBatchLink({
			url: `${supabaseUrl}/functions/v1/trpc/`,
			fetch(url, options) {
				return fetch(url, {
					...options,
					credentials: "include",
				});
			},
			headers: async () => {
				const { data: session } = await supabase.auth.getSession();
				return {
					// Authorization: `Bearer ${supabaseAnonKey}`,
					// "sb-access-token": session.session?.access_token,
					// "sb-refresh-token": session.session?.refresh_token,
					Authorization: `Bearer ${session.session?.access_token}`,
				};
			},
		}),
	],
});
// Tells Supabase Auth to continuously refresh the session automatically
// if the app is in the foreground. When this is added, you will continue
// to receive `onAuthStateChange` events with the `TOKEN_REFRESHED` or
// `SIGNED_OUT` event if the user's session is terminated. This should
// only be registered once.
AppState.addEventListener("change", (state) => {
	if (state === "active") {
		supabase.auth.startAutoRefresh();
	} else {
		supabase.auth.stopAutoRefresh();
	}
});
