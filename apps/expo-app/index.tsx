import "@expo/metro-runtime";
import "./global.css";
import "react-native-reanimated";
import "react-native-gesture-handler";
import "./lib/nativewind";

import { registerRootComponent } from "expo";
import { ExpoRoot } from "expo-router";

// Must be exported or Fast Refresh won't update the context
export function App() {
  // @ts-expect-error not a node require
  const ctx = require.context("./app");
  return <ExpoRoot context={ctx} />;
}

registerRootComponent(App);
