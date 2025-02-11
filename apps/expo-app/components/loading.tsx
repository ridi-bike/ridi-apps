import { LoaderPinwheel } from "lucide-react-native";
import { MotiView } from "moti";
import { type ViewProps } from "react-native";

export function Loading(props: ViewProps) {
  return (
    <MotiView
      {...props}
      from={{
        opacity: 0,
      }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        loop: true,
        type: "timing",
        duration: 1500,
        delay: 200,
      }}
    >
      <LoaderPinwheel className="size-full" />
    </MotiView>
  );
}
