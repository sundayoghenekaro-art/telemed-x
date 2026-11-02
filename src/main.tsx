import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installErrorReporting } from "./lib/observability";

installErrorReporting();

createRoot(document.getElementById("root")!).render(<App />);
