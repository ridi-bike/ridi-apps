import { createSignal } from "solid-js";
import { Frame } from "@nativescript/core";
import { apiClient } from "~/api/api-client";
import { useRoute, useRouter } from "solid-navigation";

export const RootPage = () => {
	const [text, setText] = createSignal("");
	const router = useRouter();
	return (
		<>
			<actionbar title="Hello, SolidJS!" />
			<flexboxlayout className="flex-col">
				<textfield on:textChange={(e) => setText(e.value || "")}>
					some text
				</textfield>
				<button
					className="rounded-md border-solid border-4 border-red-500 bg-green-300"
					on:tap={async () => {
						console.log({ ttt: text() });
						try {
							const res = await apiClient.example.hello.query(text());
							alert(res);
						} catch (err) {
							console.error(err);
						}
						alert("fofof");
					}}
				>
					do stuff
				</button>
				<button
					on:tap={() => {
						try {
							router.navigate("AuthPage");
						} catch (error) {
							console.error(error);
						}
					}}
				>
					open auth
				</button>
			</flexboxlayout>
		</>
	);
};
