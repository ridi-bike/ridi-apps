import { useMutation, useQuery } from "@tanstack/react-query";
import { trpcClient } from "../supabase";
import { useEffect } from "react";
import { Storage } from "../storage";

type Plan = Awaited<
	ReturnType<typeof trpcClient.plans.list.query>
>["data"][number];
// type PlanNew = Parameters<typeof trpcClient.plans.create.mutate>[0]["data"];

const dataKey = "plans";
const plansStorage = new Storage<Plan[], "v1">(dataKey, "v1");

export function useStorePlans() {
	const { data, error, status } = useQuery({
		queryKey: ["plans"],
		queryFn: async () =>
			trpcClient.plans.list.query({ version: plansStorage.dataVersion }),
		initialData: () => {
			const storedData = plansStorage.get();
			if (storedData) {
				return {
					data: storedData,
					version: plansStorage.dataVersion,
				};
			}
		},
	});

	useEffect(() => {
		if (data) {
			plansStorage.set(data);
		}
	}, [data]);

	return { data, error, status };
}
