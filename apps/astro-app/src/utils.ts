import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Format the date to a string
export function formatDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  return new Date(date).toLocaleDateString(undefined, options);
}

// Capitalize the first letter
export function capitalize(str: string): string {
  if (typeof str !== "string" || str.length === 0) {
    return str;
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
