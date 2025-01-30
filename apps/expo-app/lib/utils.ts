import { clsx, type ClassValue } from "clsx";
import { useEffect, useRef } from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function useEffectOnce(fn: Parameters<typeof useEffect>[0]) {
  const calledRef = useRef(false);
  useEffect(() => {
    if (!calledRef.current) {
      return fn();
    }
  }, [fn]);
}
