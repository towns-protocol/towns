import React from "react";
import { BrowserRouter } from "react-router-dom";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "allotment/dist/style.css";

const isDev = import.meta.env.DEV;

if (isDev) {
  // Register runtime-error overlay
  // From: https://github.com/vitejs/vite/issues/2076
  const showErrorOverlay = (event: ErrorEvent) => {
    // must be within function call because that's when the element is defined for sure.
    const ErrorOverlay = customElements.get("vite-error-overlay");
    // don't open outside vite environment
    if (!ErrorOverlay) {
      return;
    }
    console.log(event.error);
    const overlay = new ErrorOverlay(event.error);
    document.body.appendChild(overlay);
  };

  window.addEventListener("error", showErrorOverlay);
  window.addEventListener("unhandledrejection", ({ reason }) =>
    showErrorOverlay(reason),
  );
}

const node = document.getElementById("root");

if (node) {
  createRoot(node).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  );
}
