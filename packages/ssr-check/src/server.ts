if (!import.meta.env.SSR) {
	console.error("Server only code running on client");
	throw new Error("Server only code running on client");
}
