import "./styles.css";
import { startApp } from "./app";
import { initPwa } from "./pwa";

const root = document.querySelector<HTMLDivElement>("#app");
if (root) {
  void startApp(root);
}

initPwa();
