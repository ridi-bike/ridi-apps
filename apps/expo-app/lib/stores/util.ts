import { router } from "expo-router";

import { supabase } from "../supabase";

import { $session } from "./session-store";

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
    $session.set(null);
    supabase.auth.signOut().then(() => {
      router.replace("/");
    });
  }
  console.error(
    `Error from API call. Expected ${successCode}, got ${response.status}`,
    response.body,
  );
  throw new Error(`Error from API call: ${JSON.stringify(response.body)}`);
}
