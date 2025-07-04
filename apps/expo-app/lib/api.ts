import { apiContract } from "@ridi/api-contracts";
import { initClient, tsRestFetchApi } from "@ts-rest/core";
import { router } from "expo-router";

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

type GetRespTypeFromCode<
  TCode extends number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TResp extends { status: number; body: any },
> = Extract<TResp, { status: TCode }>;

export function getSuccessResponseOrThrow<
  TCode extends number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TResp extends { status: number; body: any },
>(
  successCode: TCode,
  response: TResp,
): GetRespTypeFromCode<TCode, TResp>["body"] {
  if (response.status === successCode) {
    return response.body;
  }

  if (response.status === 401) {
    supabase.auth.signOut({ scope: "local" }).then(() => {
      router.replace("/");
    });
  }
  console.error(
    `Error from API call. Expected ${successCode}, got ${response.status}`,
    response.body,
  );
  throw new Error(`Error from API call: ${JSON.stringify(response.body)}`);
}
