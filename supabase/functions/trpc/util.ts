import { custom, pipe, string } from "valibot";

export type FieldsNotNull<T extends object> = {
	[n in keyof T]: NonNullable<T[n]>;
};

export const numberStr = pipe(
	custom((v) => Number(v).toString() === v),
	string(),
);

export const lon = pipe(
	custom((v) => {
		const n = Number(v);
		return n >= -180 && n <= 180 && n.toString() === v;
	}),
	string(),
);

export const lat = pipe(
	custom((v) => {
		const n = Number(v);
		return n >= -90 && n <= 90 && n.toString() === v;
	}),
	string(),
);
