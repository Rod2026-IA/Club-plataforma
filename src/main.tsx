import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker } from "@/lib/pushNotifications";

createRoot(document.getElementById("root")!).render(<App />);

// Registrar service worker (solo fuera de iframe del editor)
registerServiceWorker();
