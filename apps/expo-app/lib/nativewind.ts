import { MotiText as MotiTextOrig } from "moti";
import { MotiPressable as MotiPressableOrig } from "moti/interactions";
import { remapProps } from "nativewind";

export const MotiPressable = remapProps(MotiPressableOrig, {
  className: "style",
});

export const MotiText = remapProps(MotiTextOrig, {
  className: "style",
});
