import { createSignal } from "solid-js";
import { apiClient } from "./api/router";

export const MainApp = () => {
	const [text, setText] = createSignal("");
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
			</flexboxlayout>
		</>
	);
};
