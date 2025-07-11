import { useLocalSearchParams, router } from "expo-router";
import { useMemo } from "react";
import { debounce } from "throttle-debounce";
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
      let parsedValue;
      try {
        parsedValue = JSON.parse(paramsValue as string);
      } catch (err) {
        console.error("Error parsing query param", err);
        return;
      }
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

  const setValue = useMemo(() => {
    return debounce(300, (newValue?: T) => {
      router.setParams({
        [key]: newValue !== undefined ? JSON.stringify(newValue) : undefined,
      });
    });
  }, [key]);

  return [value, setValue];
}

function setUrlParams<T>(key: string, schema: z.Schema<T>, value: T): void {
  const params = schema.parse(value);
  router.setParams({ [key]: JSON.stringify(params) });
}

export function constructUrlParamsHook<T>(
  key: string,
  schema: z.Schema<T>,
): [() => ReturnType<typeof useUrlParams<T>>, (value: T) => void] {
  return [() => useUrlParams(key, schema), (v) => setUrlParams(key, schema, v)];
}
