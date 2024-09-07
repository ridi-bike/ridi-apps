import type { LogContext } from "./context/log-context.server";

function hasMessage(v: unknown): v is { message: string } {
	if (v && (v as { message: string }).message) {
		return true;
	}
	return false;
}

export class AppError extends Error {
	public context: LogContext | null = null;

	constructor(
		public readonly code: string,
		public readonly text: string,
		public readonly requestId: string | null,
		public readonly metadata?: Record<string, unknown> | null,
		public readonly innerError?: unknown,
	) {
		super(
			`${code}: ${text}${hasMessage(innerError) ? `: ${innerError.message}` : ""
			}`,
		);
	}
}
