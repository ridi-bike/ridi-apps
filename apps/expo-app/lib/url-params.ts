import { useLocalSearchParams, router } from "expo-router";
import { useCallback, useMemo } from "react";
import type * as z from "zod";

export function useUrlParams<T>(
  key: string,
  schema: z.Schema<T>,
): [T | undefined, (d?: T) => void] {
  const params = useLocalSearchParams();
  const paramsValue = params[key];

  const value: T | undefined = useMemo(() => {
    if (
      paramsValue !== undefined &&
      !Array.isArray(paramsValue) &&
      paramsValue !== "undefined"
    ) {
      const parsedValue = JSON.parse(paramsValue as string);
      const checkedValue = schema.safeParse(parsedValue);
      if (checkedValue.success) {
        return checkedValue.data;
      }
      console.error(
        "Error parsing query param, not matching schema",
        key,
        paramsValue,
        checkedValue.error,
      );
    }
  }, [key, paramsValue, schema]);

  const setValue = useCallback(
    (newValue?: T) => {
      router.setParams({
        [key]: newValue !== undefined ? JSON.stringify(newValue) : undefined,
      });
    },
    [key],
  );

  return [value, setValue];
}
