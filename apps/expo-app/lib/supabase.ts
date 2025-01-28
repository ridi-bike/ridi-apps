import { createTRPCClient, httpBatchLink, loggerLink } from "@trpc/client";
import { AppState, Platform } from "react-native";
import superjson from "superjson";

import  { type AppRouter } from "../../../supabase/functions/trpc/router";

import "react-native-url-polyfill/auto";
import { MMKV } from "react-native-mmkv";
import { type SupportedStorage, createClient } from "@supabase/supabase-js";

import  { type Database } from "../../../services/ridi-router/packages/lib/supabase";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error("Missing env variables");
}

class StorageMMKV implements SupportedStorage {
	private mmkv = new MMKV();

	getItem(key: string): string | Promise<string | null> | null {
		return this.mmkv.getString(key) || null;
	}
	setItem(key: string, value: string): void | Promise<void> {
		return this.mmkv.set(key, value);
	}
	removeItem(key: string): void | Promise<void> {
		return this.mmkv.delete(key);
	}
	isServer?: boolean | undefined;
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
	auth: {
		storage: Platform.OS !== "web" ? new StorageMMKV() : undefined,
		autoRefreshToken: true,
		persistSession: true,
		detectSessionInUrl: false,
	},
});

const links = [
	loggerLink(),
	httpBatchLink({
		url: `${supabaseUrl}/functions/v1/trpc/`,
		transformer: superjson,
		fetch(url, options) {
			return fetch(url, {
				...options,
				credentials: "include",
				signal: null,
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
];

export const trpcClient = createTRPCClient<AppRouter>({
	links,
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
