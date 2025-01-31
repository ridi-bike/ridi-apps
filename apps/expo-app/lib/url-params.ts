import { useLocalSearchParams, router } from "expo-router";
import { useCallback, useMemo } from "react";
import { type GenericSchema, safeParse } from "valibot";

export function useUrlParams<T>(
  key: string,
  schema: GenericSchema<T>,
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
      const checkedValue = safeParse(schema, parsedValue);
      if (checkedValue.success) {
        return checkedValue.output;
      }
      console.error(
        "Error parsing query param, not matching schema",
        key,
        paramsValue,
        checkedValue.issues,
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
