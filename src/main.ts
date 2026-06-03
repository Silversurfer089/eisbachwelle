import "./styles.css";
import { startApp } from "./app";

const root = document.querySelector<HTMLDivElement>("#app");
if (root) {
  void startApp(root);
}
