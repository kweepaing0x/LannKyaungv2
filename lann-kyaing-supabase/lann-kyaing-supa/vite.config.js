import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// PWA is DISABLED — it causes reload/cache bugs
// Re-enable later once the app is stable
export default defineConfig({
  plugins: [react()],
});

