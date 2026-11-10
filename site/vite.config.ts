import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

// `npm run preview` serves the build with the same headers Vercel will send,
// so a content-security-policy mistake shows up locally first.
const vercel = JSON.parse(readFileSync(new URL("./vercel.json", import.meta.url), "utf8"));
const headers = Object.fromEntries(
  (vercel.headers?.[0]?.headers ?? []).map((h: { key: string; value: string }) => [h.key, h.value]),
);

export default defineConfig({
  plugins: [react()],
  build: { sourcemap: false },
  preview: { headers },
});
