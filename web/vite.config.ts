import { defineConfig } from "vite";

export default defineConfig({
  // Relative base so the built site works at any mount path
  // (GitHub Pages project sites live under /<repo>/).
  base: "./",
});
