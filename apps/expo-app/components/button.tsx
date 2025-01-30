import type React from "react";
import { Pressable } from "react-native";

import { cn } from "~/lib/utils";

const baseStyles =
  "px-6 py-3 rounded-xl font-medium text-lg transition-all duration-200 active:scale-95";
const variantStyles = {
  primary:
    "bg-[#FF5937] text-white border-2 border-black dark:border-gray-700 hover:bg-[#ff4a25]",
  secondary:
    "bg-white dark:bg-gray-800 text-[#FF5937] border-2 border-black dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700",
};

type ButtonProps = {
  variant?: keyof typeof variantStyles;
  fullWidth?: boolean;
  children: React.ReactNode;
} & React.ComponentPropsWithoutRef<typeof Pressable>;
export const Button = ({
  variant = "primary",
  fullWidth = false,
  children,
  className = "",
  ...props
}: ButtonProps) => {
  return (
    <Pressable
      className={cn(baseStyles, variantStyles[variant], className, {
        "w-full": fullWidth,
      })}
      {...props}
    >
      {children}
    </Pressable>
  );
};
