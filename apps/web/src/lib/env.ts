export const isLocalDev = () => {
	return !import.meta.env.PROD as boolean;
};

export const httpHttps = () => {
	if (isLocalDev()) {
		return "http://";
	}

	return "https://";
};
