import { createSignal } from "solid-js";

export const MainApp = () => {
	const [s1, setS1] = createSignal("");
	const [s2, setS2] = createSignal("");
	return (
		<>
			<actionbar title="Hello, SolidJS!" />
			<stacklayout>
				<flexboxlayout className="bg-red-300 flex-col rounded-lg border-lime-500 border-solid border-8 p-2 h-96">
					<searchbar on:textChange={(e) => setS1(e.target.text)}>
						some text here omg
					</searchbar>
					<searchbar on:textChange={(e) => setS2(e.target.text)}>
						some text here omg
					</searchbar>
					<label
						text={s1()}
						className="h-6 w-12 bg-green-100 m-4"
						height={12}
						width={24}
					/>
					<label text={s2()} />
				</flexboxlayout>
			</stacklayout>
		</>
	);
};
