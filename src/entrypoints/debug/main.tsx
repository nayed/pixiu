import { render } from "preact";
import { App } from "./App";
import "../popup/style.css";
import "./style.css";

const root = document.getElementById("app");
if (root) render(<App />, root);
