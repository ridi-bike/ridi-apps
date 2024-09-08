if (import.meta.env.SSR) {
	throw new Error("Client only code running on server");
}
