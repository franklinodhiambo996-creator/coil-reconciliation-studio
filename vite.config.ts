import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Extra hostnames allowed to reach the dev server (set per process, never hardcoded).
const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const allowedHosts = (env.VITE_ALLOWED_HOSTS ?? "")
  .split(",")
  .map((host: string) => host.trim())
  .filter(Boolean);

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    ...(allowedHosts.length ? { allowedHosts } : {}),
  },
  preview: {
    host: "0.0.0.0",
    port: 3000,
    ...(allowedHosts.length ? { allowedHosts } : {}),
  },
});
