import cuid from "@bugsnag/cuid";

function hasMessage(v: unknown): v is { message: string } {
	if (v && (v as { message: string }).message) {
		return true;
	}
	return false;
}

export class AppError extends Error {
	public errorId = cuid();
	constructor(
		public readonly code: string,
		public readonly text: string,
		public readonly metadata?: Record<string, unknown> | null,
		public readonly innerError?: unknown,
	) {
		super(
			`${code}: ${text}${hasMessage(innerError) ? `: ${innerError.message}` : ""
			}`,
		);
	}
}
