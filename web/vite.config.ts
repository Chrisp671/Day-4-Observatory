import { defineConfig } from "vite";

export default defineConfig({
  // Relative base so the built site works at any mount path
  // (GitHub Pages project sites live under /<repo>/).
  base: "./",
  // One page: the instrument. Design-review pages were scaffolding for
  // decisions now recorded in PLAN.md (DEC-016..027) and have been removed.
});
