import { createApp } from "./app";
import { env } from "./config/env";
import { connectDB, disconnectDB } from "./config/db";
import { logger } from "./utils/logger";
import { startBackgroundJobs, stopBackgroundJobs } from "./services/backgroundJobs.service";

async function bootstrap(): Promise<void> {
  await connectDB();

  const app = createApp();
  startBackgroundJobs(env.backgroundJobsEnabled, env.BACKGROUND_JOB_INTERVAL_MINUTES);

  const server = app.listen(env.PORT, () => {
    logger.info(`Pest Mantra API listening on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      stopBackgroundJobs();
      await disconnectDB();
      logger.info("Shutdown complete.");
      process.exit(0);
    });

    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled promise rejection", reason);
  });

  process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception", err);
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  logger.error("Failed to bootstrap application", err);
  process.exit(1);
});
