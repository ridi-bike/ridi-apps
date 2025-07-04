import * as QueryParams from "expo-auth-session/build/QueryParams";
import * as Linking from "expo-linking";
import { type Href } from "expo-router";
import { useRouter } from "expo-router";
import { useCallback, useEffect } from "react";

import { supabase } from "~/lib/supabase";

export function useCreateSessionFromUrl() {
  const url = Linking.useURL();
  const {
    params: { access_token, refresh_token },
    errorCode,
  } = QueryParams.getQueryParams(url || "");

  const router = useRouter();

  const clearUrlParas = useCallback(() => {
    if (url) {
      const clearedUrl = new URL(url);
      clearedUrl.hash = "";
      router.replace(clearedUrl.toString() as Href);
    }
  }, [router, url]);

  useEffect(() => {
    if (errorCode) {
      throw new Error(errorCode);
    }

    if (!access_token) {
      return;
    }

    supabase.auth
      .setSession({
        access_token,
        refresh_token: refresh_token || "",
      })
      .then(() => {
        clearUrlParas();
      })
      .catch((error) => {
        console.error("error on set session", error);
        clearUrlParas();
      });
  }, [access_token, clearUrlParas, errorCode, refresh_token, router, url]);

  if (access_token || refresh_token) {
    return true;
  }

  return false;
}
