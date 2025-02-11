import { MotiPressable } from "moti/interactions";
import { remapProps } from "nativewind";

// Call this once at the entry point of your app
remapProps(MotiPressable, {
  className: "style",
});
