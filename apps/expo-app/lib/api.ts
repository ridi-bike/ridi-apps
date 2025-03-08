import { apiContract } from "@ridi/api-contracts";
import { initClient, tsRestFetchApi } from "@ts-rest/core";

import { supabase } from "./supabase";

const apiUrl = process.env.EXPO_PUBLIC_API_URL;
if (!apiUrl) {
  throw new Error("API URL missing in EXPO_PUBLIC_API_URL");
}
export const apiClient = initClient(apiContract, {
  baseUrl: `${apiUrl}/private`,

  api: async (args) => {
    const { data: session } = await supabase.auth.getSession();
    args.headers.Authorization = `Bearer ${session.session?.access_token}`;

    return tsRestFetchApi(args);
  },
});
