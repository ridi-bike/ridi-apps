import { useQuery } from "@tanstack/react-query";

import { apiClient } from "~/lib/api";

import { getSuccessResponseOrThrow } from "./stores/util";

const DATA_VERSION = "v1";

export function useUser() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["user", DATA_VERSION],
    queryFn: () =>
      apiClient
        .userGet({
          query: {
            version: DATA_VERSION,
          },
        })
        .then((response) => getSuccessResponseOrThrow(200, response)),
  });

  return { user: data?.data, isLoading, error, refetch };
}
