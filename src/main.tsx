import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { VICIProvider } from "./contexts/VICIContext";
import { GroupProvider } from "./contexts/GroupContext";

createRoot(document.getElementById("root")!).render(
  <VICIProvider>
    <GroupProvider>
      <App />
    </GroupProvider>
  </VICIProvider>
);
