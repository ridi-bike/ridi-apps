import { hc } from "hono/client";
// const { hc } = require("hono/client") as typeof import("hono/client");

import { type RidiHonoApp } from "../../../services/cfw-api/src";

import { supabase } from "./supabase";

const apiUrl = process.env.EXPO_PUBLIC_API_URL;
if (!apiUrl) {
  throw new Error("API URL missing in EXPO_PUBLIC_API_URL");
}
export const apiClient = hc<RidiHonoApp>(apiUrl, {
  headers: async () => {
    const { data: session } = await supabase.auth.getSession();
    return {
      // Authorization: `Bearer ${supabaseAnonKey}`,
      // "sb-access-token": session.session?.access_token,
      // "sb-refresh-token": session.session?.refresh_token,
      Authorization: `Bearer ${session.session?.access_token}`,
    };
  },
});
