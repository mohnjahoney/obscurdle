import { defineConfig } from "vite"

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 2_000,
  },
  test: {
    environment: "node",
  },
})
