import { type Provider } from "@supabase/supabase-js";
import { Stack } from "expo-router";
import { Github, MailIcon } from "lucide-react-native";
import { useState } from "react";
import { View, Text } from "react-native";

import { Button } from "~/components/button";
import { Input } from "~/components/input";
import { supabase } from "~/lib/supabase";

async function performOAuth(provider: Provider) {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
  });
  if (error) {
    throw error;
  }
}

async function performOTPAuth() {
  const { error } = await supabase.auth.signInWithOtp({
    email: "valid.email@supabase.io",
  });
  if (error) {
    throw error;
  }
}

async function validateOTPAuth(email: string, token: string) {
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
    const { error } = await supabase.auth.setSession(session);
    if (error) {
      throw error;
    }
  }
}

export default function LoginScreen() {
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
            className="text-6xl font-bold tracking-tight text-[#FF5937] dark:text-gray-100"
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
              <Github size={24} />
              Continue with GitHub
            </Button>
            <Button
              className="flex flex-row items-center justify-center gap-2"
              variant="secondary"
              fullWidth
              onPress={() => performOAuth("google")}
            >
              <Github size={24} />
              Continue with Google
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
              Continue with Email
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
                />
                <Button
                  disabled={!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}
                  variant="primary"
                  fullWidth
                  onPress={performOTPAuth}
                >
                  Send Code
                </Button>
              </>
            ) : (
              <>
                <Input
                  label="Enter verification code"
                  placeholder="Enter 6-digit code"
                  value={code}
                  onChangeText={(code) => setCode(code)}
                />
                <Button
                  disabled={!code}
                  variant="primary"
                  fullWidth
                  onPress={() => validateOTPAuth(email, code)}
                >
                  Verify Code
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
              Back
            </Button>
          </View>
        )}
      </View>
    </View>
  );
}
