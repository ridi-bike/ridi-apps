import { getSession } from "@solid-mediakit/auth";
import { cache, redirect } from "@solidjs/router";
import { getWebRequest } from "vinxi/http";
import { authOptions } from "./auth";

const getUser = cache(async () => {
	"use server";
	const request = getWebRequest();
	const session = await getSession(request, authOptions);
	if (!session) {
		throw redirect("/");
	}
	return session;
}, "user");

export async function tryAction() {
	const user = getUser();
}

export async function tryLoader() {
	const user = getUser();
	return cache;
}
