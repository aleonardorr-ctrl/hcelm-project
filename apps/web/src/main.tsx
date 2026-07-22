import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { installAuthFailureInterceptor } from "./lib/auth";
import "./index.css";

installAuthFailureInterceptor();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
