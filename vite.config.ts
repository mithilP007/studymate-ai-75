import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import viteTsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    TanStackRouterVite({ autoCodeSplitting: true }),
    server: {
      entry: "server",
      // Vercel preset for production SSR deployment
      preset: "vercel",
    },
    }),
react(),
  tailwindcss(),
  viteTsConfigPaths(),
  ],
});
