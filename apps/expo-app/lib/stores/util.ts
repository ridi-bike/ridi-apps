import { type QueryClient } from "@tanstack/react-query";
import { router } from "expo-router";

import { supabase } from "../supabase";

type GetRespTypeFromCode<
  TCode extends number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TResp extends { status: number; body: any },
> = Extract<TResp, { status: TCode }>;

export function getSuccessResponseOrThrow<
  TCode extends number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TResp extends { status: number; body: any },
>(
  successCode: TCode,
  response: TResp,
): GetRespTypeFromCode<TCode, TResp>["body"] {
  if (response.status === successCode) {
    return response.body;
  }

  if (response.status === 401) {
    supabase.auth.signOut({ scope: "local" }).then(() => {
      router.replace("/");
    });
  }
  console.error(
    `Error from API call. Expected ${successCode}, got ${response.status}`,
    response.body,
  );
  throw new Error(`Error from API call: ${JSON.stringify(response.body)}`);
}

export type SyncStatus = {
  isSyncPending: boolean;
  isDeleted?: boolean;
};

export async function cacheListUpdateOnMutate<T extends { id: string }>(
  queryClient: QueryClient,
  queryKey: string[],
  args: { action: "upsert"; rowIn: T } | { action: "delete"; id: string },
) {
  await queryClient.cancelQueries({ queryKey });
  queryClient.setQueryData<(T & SyncStatus)[]>(queryKey, (rowList) => {
    if (args.action === "delete") {
      const { id } = args;
      return rowList?.map((rowOld) => ({
        ...rowOld,
        isSyncPending: true,
        isDeleted: rowOld.id === id,
      }));
    }
    const { rowIn } = args;
    if (!rowList) {
      return [{ ...rowIn, isSyncPending: true }];
    }
    if (!rowList.some((rowOld) => rowOld.id === rowIn.id)) {
      return rowList.concat([{ ...rowIn, isSyncPending: true }]);
    }
    return rowList.map((rowOld) =>
      rowOld.id === rowIn.id
        ? {
            ...rowOld,
            ...rowIn,
            isSyncPending: true,
          }
        : rowOld,
    );
  });
}

export function getCacheListUpdaterOnSuccess<T extends { id: string }>(
  queryClient: QueryClient,
  queryKey: string[],
): (args: { action: "upsert" | "delete"; id: string }) => void {
  return (args) =>
    queryClient.setQueryData<(T & SyncStatus)[]>(queryKey, (rowList) => {
      if (args.action === "delete") {
        return rowList?.filter((rowOld) => rowOld.id !== args.id);
      }
      return rowList?.map((rowOld) => ({
        ...rowOld,
        isSyncPending: rowOld.id === args.id ? false : rowOld.isSyncPending,
      }));
    });
}

export function withSyncStatus<T extends { id: string }>(rows: T[]) {
  return rows as (T & SyncStatus)[];
}
