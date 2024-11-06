import { MMKV } from "react-native-mmkv";
import superjson from "superjson";

const mmkv = new MMKV();
const storageVersion = "sv1";

type StorageData<TData, TVersion extends string> = {
	version: TVersion;
	data: TData;
};

export class Storage<TData, TVersion extends string> {
	constructor(
		private readonly dataKey: string,
		public readonly dataVersion: TVersion,
	) { }

	private getKey(): string {
		return `${storageVersion}-${this.dataKey}-${this.dataVersion}`;
	}

	set(data: StorageData<TData, TVersion>) {
		mmkv.set(this.getKey(), superjson.stringify(data.data));
	}

	get(): TData | undefined {
		const stringData = mmkv.getString(this.getKey());
		if (stringData) {
			return superjson.parse(stringData);
		}
	}
}
