import { useLocalSearchParams, router } from "expo-router";

export function useUrlParams<T>(key: string): [T | undefined, (d?: T) => void] {
  const params = useLocalSearchParams();

  return [
    params[key] !== undefined && !Array.isArray(params[key])
      ? JSON.parse(params[key] as string)
      : undefined,
    (d) => {
      router.setParams({
        [key]: d !== undefined ? JSON.stringify(d) : undefined,
      });
    },
  ];
}
