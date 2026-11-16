import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

// Backend Express của dự án (server/). `npm run hub` ở thư mục gốc tự đặt biến này.
const api = process.env.HUB_API || "http://127.0.0.1:8789";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: "127.0.0.1",
    // 5173 là cổng của bản đang kinh doanh; dùng cổng riêng để chạy song song được.
    port: 5274,
    strictPort: true,
    proxy: {
      "/api": { target: api, changeOrigin: false },
    },
  },
  plugins: [
    // SPA: build ra index.html tĩnh để Express phục vụ chung một cổng với API.
    tanstackStart({ spa: { enabled: true, prerender: { outputPath: "/index.html", crawlLinks: false } } }),
    nitro(),
    viteReact(),
    tailwindcss(),
  ],
});
