import { createRoot } from "react-dom/client";
import { MsalProvider } from "@azure/msal-react";

import "bootstrap/dist/css/bootstrap.min.css";
import "./index.css";

import { authService } from "./authService.js";
import App from "./App.jsx";
import "./App.css"

async function start() {
  // initialize() boots MSAL and completes any pending redirect login
  const pca = await authService.initialize();

  createRoot(document.getElementById("root")).render(
    <MsalProvider instance={pca}>
      <App />
    </MsalProvider>
  );
}

start().catch((err) => {
  console.error("Failed to start app:", err);
  const root = document.getElementById("root");
  if (root) {
    root.textContent = `App failed to start: ${err?.message || err}`;
  }
});
