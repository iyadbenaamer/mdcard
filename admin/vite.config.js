import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import svgr from "vite-plugin-svgr";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tsconfigPaths(), svgr()],
  define: {
    "process.env.NODE_ENV": JSON.stringify(
      process.env.NODE_ENV || mode || "development",
    ),
  },
  server: {
    proxy: {
      "/storage": {
        target: process.env.VITE_APP_URL || "http://localhost:5000",
        changeOrigin: true,
      },
      "/assets": {
        target: process.env.VITE_APP_URL || "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
}));
