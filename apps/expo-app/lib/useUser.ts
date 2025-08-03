import { useQuery } from "@tanstack/react-query";

import { apiClient } from "~/lib/api";

import { getSuccessResponseOrThrow } from "./stores/util";

const DATA_VERSION = "v1";
export const USER_QUERY_KEY = ["user", DATA_VERSION];
type OkResp = Extract<
  Awaited<ReturnType<(typeof apiClient)["userGet"]>>,
  { status: 200 }
>;
export type UserResponse = OkResp["body"];

export function useUser() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: USER_QUERY_KEY,
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
