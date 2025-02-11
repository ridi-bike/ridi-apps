import { MotiPressable as MotiPressableOrig } from "moti/interactions";
import { remapProps } from "nativewind";

export const MotiPressable = remapProps(MotiPressableOrig, {
  className: "style",
});
