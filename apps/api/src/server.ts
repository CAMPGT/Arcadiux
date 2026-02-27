import { buildApp } from "./app.js";
import { config } from "./config/index.js";
import { setupWebSocket } from "./websocket/ws-server.js";

async function main() {
  const app = await buildApp();

  const shutdown = async (signal: string) => {
    app.log.info(`Received ${signal}, shutting down gracefully...`);
    try {
      await app.close();
      app.log.info("Server closed successfully");
      process.exit(0);
    } catch (err) {
      app.log.error(err, "Error during shutdown");
      process.exit(1);
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  try {
    await app.listen({
      port: config.API_PORT,
      host: config.API_HOST,
    });

    // Setup Socket.IO on the underlying HTTP server
    setupWebSocket(app.server);

    app.log.info(
      `Server listening on http://${config.API_HOST}:${config.API_PORT}`,
    );
  } catch (err) {
    app.log.error(err, "Failed to start server");
    process.exit(1);
  }
}

main();
