import { createRoot } from "react-dom/client";

import { createApp } from "./main.tsx";
const rootDiv = document.getElementById("root");
if (!rootDiv) {
  throw new Error("root div not found");
}
const root = createRoot(rootDiv);
root.render(createApp());
