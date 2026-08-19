import { defineConfig } from "vite";

export default defineConfig({
  // Relative base so the built site works at any mount path
  // (GitHub Pages project sites live under /<repo>/).
  base: "./",
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        // The WI-008 design record: before/after at one fixed sky state.
        compare: "compare.html",
        // Type directions for review (DEC-016).
        type: "type.html",
        // The Vault: the sacred-architecture direction (DEC-016).
        vault: "vault.html",
      },
    },
  },
});
