import { type SupportedStorage, createClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";
import { MMKV } from "react-native-mmkv";

import "react-native-url-polyfill/auto";

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

export const supabase = createClient<unknown>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS !== "web" ? new StorageMMKV() : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
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
