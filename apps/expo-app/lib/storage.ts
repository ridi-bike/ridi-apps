import { MMKV } from "react-native-mmkv";
import superjson from "superjson";
import type { Plan, PlanNew } from "./stores/plans-store";
import type { Route } from "./stores/routes-store";

const mmkv = new MMKV();
const storageVersion = "sv1";

export class Storage<TData, TVersion extends string> {
	constructor(
		private readonly dataKey: string,
		public readonly dataVersion: TVersion,
	) { }

	private getKey(): string {
		return `${storageVersion}/${this.dataKey}/${this.dataVersion}`;
	}

	set(data: TData) {
		mmkv.set(this.getKey(), superjson.stringify(data));
	}

	get(): TData | undefined {
		const stringData = mmkv.getString(this.getKey());
		if (stringData) {
			return superjson.parse(stringData);
		}
	}
}

export const plansStorage = new Storage<Plan[], "v1">("plans", "v1");
export const plansPendingStorage = new Storage<PlanNew[], "v1">(
	"plans-pending",
	"v1",
);

export function getRouteStorage(routeId: string): Storage<Route, "v1"> {
	return new Storage<Route, "v1">(`route/${routeId}`, "v1");
}
