import { makeRedirectUri } from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";

import { supabase } from "~/lib/supabase";

import { Button } from "./button";
import { Link } from "./link";
import { Text } from "./ui/text";

const redirectTo = makeRedirectUri();

const createSessionFromUrl = async (url: string) => {
  const { params, errorCode } = QueryParams.getQueryParams(url);

  if (errorCode) {
    throw new Error(errorCode);
  }

  const { access_token, refresh_token } = params;

  if (!access_token) {
    return;
  }

  console.log({ access_token, refresh_token });
  if (access_token || refresh_token) {
    WebBrowser.maybeCompleteAuthSession(); // required for web only
    router.setParams({ access_token: undefined, refresh_token: undefined });
  }

  const { data, error } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });

  if (error) {
    throw error;
  }

  return data.session;
};

const performOAuth = async () => {
  const { data, error } = await supabase.auth.linkIdentity({
    provider: "github",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });
  if (error) {
    throw error;
  }
  console.log("test here 2", { redirectTo });
  // if (Platform.OS !== "web") {
  const res = await WebBrowser.openAuthSessionAsync(
    data?.url ?? "",
    redirectTo,
  );
  console.log("after open auth session");

  if (res.type === "success") {
    const { url } = res;
    await createSessionFromUrl(url);
  }
  // } else {
  // 	window.location.href = data?.url;
  // }
};

const sendMagicLink = async () => {
  const { error } = await supabase.auth.signInWithOtp({
    email: "example@email.com",
    options: {
      emailRedirectTo: redirectTo,
    },
  });

  if (error) {
    throw error;
  }
  // Email sent.
};

export default function Auth() {
  // Handle linking into app from email app.

  const url = Linking.useURL();
  useEffect(() => {
    if (url) {
      createSessionFromUrl(url);
    }
  }, [url]);

  return (
    <>
      <Button variant="primary" fullWidth onPress={performOAuth}>
        <Text>
          Sign in
        </Text>
      </Button>
      <Link variant="secondary" fullWidth href="/plans" replace>
        <Text>
          Try it out
        </Text>
      </Link>
    </>
  );
}
