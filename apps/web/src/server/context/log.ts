import "@ridi/server-client-check/server-only";

type LogContextBase = {
	env: string;
};

type LogContextWorker = {
	type: "worker";
	jobId: string;
} & LogContextBase;

type LogContextRequest = {
	type: "request";
	requestId: string;
	userId: string | null;
} & LogContextBase;

export type LogContext = LogContextWorker | LogContextRequest;

export function getLogContextWorker(jobId: string): LogContextWorker {
	return {
		type: "worker",
		jobId: jobId,
		env: process.env.RIDI_ENV,
	};
}

export function getLogContextRequest(
	requestId: string,
	userId: string | null,
): LogContextRequest {
	return {
		type: "request",
		requestId,
		userId,
		env: process.env.RIDI_ENV,
	};
}
