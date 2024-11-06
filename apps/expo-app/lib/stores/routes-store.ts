import { useMutation, useQuery } from "@tanstack/react-query";
import { trpcClient } from "../supabase";
import { useEffect, useMemo } from "react";
import { Storage } from "../storage";

type Route = Awaited<ReturnType<typeof trpcClient.routes.get.query>>["data"];

const dataKey = "routes";

export function useStoreRoute(routeId: string) {
	const routeStore = useMemo(
		() => new Storage<Route, "v1">(`${dataKey}:${routeId}`, "v1"),
		[routeId],
	);

	const { data, error, status } = useQuery({
		queryKey: ["route", routeId],
		queryFn: async () =>
			trpcClient.routes.get.query({
				version: routeStore.dataVersion,
				data: { routeId },
			}),
		initialData: () => {
			const storedData = routeStore.get();
			if (storedData) {
				return {
					data: storedData,
					version: routeStore.dataVersion,
				};
			}
		},
	});

	useEffect(() => {
		if (data) {
			routeStore.set(data);
		}
	}, [data, routeStore]);

	return { data, error, status };
}
