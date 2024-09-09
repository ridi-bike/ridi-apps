import { createSession, signOut } from "@solid-mediakit/auth/client";
import { createSignal, Show, type VoidComponent } from "solid-js";
import { tryBackendQuery, tryBackendAction } from "~/server/api/try-backend-call";

const Protected: VoidComponent = () => {
	const session = createSession();
	const [name, setName] = createSignal("");

	const buttonClick = (name: string) => {
		"use server";
		return tryBackendAction(({ apiClient }) => {
			return apiClient.example.sendMsg(name);
		});
	};
	return (
		<>
			<h1>Protected</h1>
			<input
				value={name()}
				onChange={(e) => {
					setName(e.target.value);
				}}
			/>
			<button
				type="button"
				onClick={async () => {
					const result = await buttonClick(name());
					setName(result.result === "ok" ? result.data : result.error.code);
				}}
			>
				go and error now
			</button>

			<Show
				when={session()}
				fallback={<p>Only shown for logged in users</p>}
				keyed
			>
				{(us) => (
					<main>
						{us.user?.image ? (
							<img alt="user avatar" src={us.user?.image} />
						) : null}
						<span> Hey there {us.user?.name}! You are signed in!</span>
						<button
							type="button"
							onClick={() => {
								void signOut({
									redirectTo: "/",
									redirect: true,
								});
							}}
						>
							Sign Out
						</button>
					</main>
				)}
			</Show>
		</>
	);
};

export default Protected;
