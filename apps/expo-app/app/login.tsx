import { type Provider } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { router, Stack } from "expo-router";
import { MailIcon } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { View, Text } from "react-native";

import { Button } from "~/components/button";
import { GithubIcon } from "~/components/icons/github";
import { GoogleIcon } from "~/components/icons/google";
import { Input } from "~/components/input";
import { apiClient } from "~/lib/api";
import { supabase } from "~/lib/supabase";
import { cn } from "~/lib/utils";

export default function LoginScreen() {
  const queryClient = useQueryClient();

  const performOAuth = useCallback(
    async (provider: Provider) => {
      let fromUserAccessToken: string | undefined = undefined;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        fromUserAccessToken = session.access_token;
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
      });

      queryClient.clear();

      if (fromUserAccessToken) {
        await apiClient.userClaimData({
          body: {
            version: "v1",
            data: {
              fromUserAccessToken,
            },
          },
        });
      }
      if (error) {
        throw error;
      }
    },
    [queryClient],
  );

  const performOTPAuth = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
    });
    if (error) {
      throw error;
    }
  }, []);

  const validateOTPAuth = useCallback(
    async (email: string, token: string) => {
      let fromUserAccessToken: string | undefined = undefined;

      const {
        data: { session: oldSession },
      } = await supabase.auth.getSession();

      if (oldSession) {
        fromUserAccessToken = oldSession.access_token;
      }
      const {
        data: { session },
        error,
      } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      });
      if (error) {
        throw error;
      }
      if (session) {
        queryClient.clear();

        const { error } = await supabase.auth.setSession(session);
        if (error) {
          throw error;
        }

        if (fromUserAccessToken) {
          await apiClient.userClaimData({
            body: {
              version: "v1",
              data: {
                fromUserAccessToken,
              },
            },
          });
        }
      }
    },
    [queryClient],
  );

  useEffect(() => {
    return supabase.auth.onAuthStateChange((_event, session) => {
      if (session && !session.user.is_anonymous) {
        router.replace("/plans");
      }
    }).data.subscription.unsubscribe;
  }, []);

  const [showEmailInput, setShowEmailInput] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  return (
    <View
      role="main"
      className="flex min-h-screen w-full flex-col items-center justify-center bg-white p-6 dark:bg-gray-900"
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex w-full max-w-[375px] flex-col items-center">
        <View className="mb-12">
          <Text
            role="heading"
            aria-level={1}
            className="text-6xl font-bold tracking-tight text-[#FF5937]"
          >
            Ridi
          </Text>
        </View>
        {!showEmailInput ? (
          <View className="w-full space-y-4">
            <Button
              className="flex flex-row items-center justify-center gap-2"
              variant="secondary"
              fullWidth
              onPress={() => performOAuth("github")}
            >
              <GithubIcon className="size-6" />

              <Text className="dark:text-gray-500">Continue with GitHub</Text>
            </Button>
            <Button
              className="flex flex-row items-center justify-center gap-2"
              variant="secondary"
              fullWidth
              onPress={() => performOAuth("google")}
            >
              <GoogleIcon className="size-6" />

              <Text className="dark:text-gray-500">Continue with Google</Text>
            </Button>
            <View className="relative w-full py-4">
              <View className="absolute inset-0 flex flex-row items-center">
                <View className="w-full border-t border-gray-300 dark:border-gray-700" />
              </View>
              <View className="relative flex flex-row justify-center">
                <Text className="bg-white px-2 text-sm text-gray-500 dark:bg-gray-900 dark:text-gray-200">
                  Or
                </Text>
              </View>
            </View>
            <Button
              variant="primary"
              fullWidth
              className="flex flex-row items-center justify-center gap-2"
              onPress={() => setShowEmailInput(true)}
            >
              <MailIcon size={24} />

              <Text className="dark:text-gray-200">Continue with Email</Text>
            </Button>
          </View>
        ) : (
          <View role="form" className="w-full space-y-4">
            {!showCodeInput ? (
              <>
                <Input
                  label="Email address"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={(email) => setEmail(email)}
                  placeholder="Enter your email"
                  onSubmitEditing={() => {
                    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                      performOTPAuth(email);
                      setShowCodeInput(true);
                    }
                  }}
                />
                <Button
                  role="button"
                  disabled={!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}
                  variant="primary"
                  className={cn({
                    "opacity-40":
                      !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
                  })}
                  fullWidth
                  onPress={() => {
                    performOTPAuth(email);
                    setShowCodeInput(true);
                  }}
                >
                  <Text className="dark:text-gray-200">Send Code</Text>
                </Button>
              </>
            ) : (
              <>
                <Input
                  label="Enter verification code"
                  placeholder="Enter 6-digit code"
                  value={code}
                  onChangeText={(code) => setCode(code)}
                  onSubmitEditing={() => validateOTPAuth(email, code.trim())}
                />
                <Button
                  disabled={!code}
                  variant="primary"
                  fullWidth
                  onPress={() => validateOTPAuth(email, code.trim())}
                >
                  <Text className="dark:text-gray-200">Verify Code</Text>
                </Button>
              </>
            )}
            <Button
              variant="secondary"
              fullWidth
              onPress={() => {
                setShowEmailInput(false);
                setShowCodeInput(false);
                setEmail("");
                setCode("");
              }}
            >
              <Text className="dark:text-gray-200">Back</Text>
            </Button>
          </View>
        )}
      </View>
    </View>
  );
}
