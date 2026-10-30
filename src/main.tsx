import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router";
import "@fontsource/atkinson-hyperlegible/latin-400.css";
import "@fontsource/atkinson-hyperlegible/latin-700.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import "./index.css";
import App from "./App.tsx";
import { python } from "./python/client.ts";
import { requestPersistence } from "./db/db.ts";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

// Warm up Python in the background, so the first run is quick.
python.start();
// Ask the browser to keep IndexedDB. Settings shows the answer.
void requestPersistence();

// HashRouter: GitHub Pages has no server rewrites, so deep links live after the #.
createRoot(root).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
);
