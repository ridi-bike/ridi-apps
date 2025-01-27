import { Link as ExpoLink } from "expo-router";
import React from "react";
import { Pressable } from 'react-native';

interface LinkProps extends React.ComponentPropsWithoutRef<typeof ExpoLink> {
  variant?: "primary" | "secondary";
  fullWidth?: boolean;
  children: React.ReactNode;
}
export const Link = ({
  variant = "primary",
  fullWidth = false,
  children,
  className = "",
  ...props
}: LinkProps) => {
  const baseStyles =
    "px-6 py-3 rounded-xl font-medium text-lg transition-all duration-200 active:scale-95";
  const variantStyles = {
    primary: "bg-[#FF5937] text-white border-2 border-black hover:bg-[#ff4a25]",
    secondary: "bg-white text-[#FF5937] border-2 border-black hover:bg-gray-50",
  };
  return (
    <Link
      className={`${baseStyles} ${variantStyles[variant]} ${fullWidth ? "w-full" : ""} ${className}`
      }
      {...props}
    >
      {children}
    </Link>
  );
};
