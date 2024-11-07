import { custom, pipe, string } from "valibot";

export type FieldsNotNull<T extends object> = {
	[n in keyof T]: NonNullable<T[n]>;
};

export const numberStr = pipe(
	string(),
	custom((v) => Number(v).toString() === v),
);

export const lon = pipe(
	string(),
	custom((v) => {
		const n = Number(v);
		return n >= -180 && n <= 180 && n.toString() === v;
	}),
);

export const lat = pipe(
	string(),
	custom((v) => {
		const n = Number(v);
		return n >= -90 && n <= 90 && n.toString() === v;
	}),
);
