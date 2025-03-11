import * as QueryParams from "expo-auth-session/build/QueryParams";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useEffect } from "react";

import { supabase } from "~/lib/supabase";

export function useCreateSessionFromUrl() {
  const url = Linking.useURL();
  const router = useRouter();

  useEffect(() => {
    if (url) {
      const { params, errorCode } = QueryParams.getQueryParams(url);

      if (errorCode) {
        throw new Error(errorCode);
      }

      const { access_token, refresh_token } = params;
      console.log({ access_token, refresh_token });

      if (!access_token) {
        return;
      }

      if (access_token || refresh_token) {
        console.log("clearing");
        router.setParams({ access_token: undefined, refresh_token: undefined });
      }

      console.log("set session");
      supabase.auth.setSession({
        access_token,
        refresh_token,
      });
    }
  }, [router, url]);
}
