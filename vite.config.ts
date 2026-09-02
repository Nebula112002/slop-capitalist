import { defineConfig, type Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";

const PORT = 8896;
const HEALTH = JSON.stringify({
  ok: true,
  service: "slop-capitalist",
  port: PORT,
});

function healthPlugin(): Plugin {
  const send = (_req: IncomingMessage, res: ServerResponse) => {
    res.setHeader("Content-Type", "application/json");
    res.end(HEALTH);
  };
  return {
    name: "slop-health",
    configureServer(server) {
      server.middlewares.use("/api/health", send);
    },
    configurePreviewServer(server) {
      server.middlewares.use("/api/health", send);
    },
  };
}

export default defineConfig({
  plugins: [healthPlugin()],
  server: {
    host: true,
    port: PORT,
    strictPort: true,
    allowedHosts: true,
  },
  preview: {
    host: true,
    port: PORT,
    strictPort: true,
    allowedHosts: true,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
