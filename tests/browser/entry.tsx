import { hydrateRoot } from "react-dom/client";
import { App } from "./App";
const html = JSON.parse(document.querySelector("#payload")!.textContent!);
hydrateRoot(document.querySelector("#root")!, <App html={html} />);
