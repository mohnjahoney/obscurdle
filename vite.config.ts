import { defineConfig } from "vite"

export default defineConfig({
  base: "/obscurdle/",
  build: {
    chunkSizeWarningLimit: 2_000,
  },
  test: {
    environment: "node",
  },
})
