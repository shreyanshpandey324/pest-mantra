import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import path from "path";
import { env } from "./config/env";
import apiRoutes from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { globalRateLimiter } from "./middleware/rateLimit.middleware";

export function createApp(): Application {
  const app = express();

  // Trust the first proxy hop (needed for correct req.ip behind
  // a load balancer / reverse proxy in production, and for
  // express-rate-limit to key on the real client IP).
  app.set("trust proxy", 1);

  app.use(
    helmet({
      contentSecurityPolicy: env.isProduction ? undefined : false,
    })
  );

  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true, // required so the refresh-token cookie is sent/received
    })
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(cookieParser());

  if (env.isDevelopment) {
    app.use(morgan("dev"));
  }

  app.use(globalRateLimiter);

  // MVP photo storage (see upload.middleware.ts for the production
  // migration note). Filenames are random hex, not sequential IDs,
  // so this isn't directly browsable/enumerable — but it is NOT
  // access-controlled the way the API routes are. Treat this as a
  // known gap to close (signed URLs or an authenticated proxy route)
  // before real customer photos are stored here.
  app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

  app.get("/health", (_req, res) => {
    res.status(200).json({ success: true, message: "OK", uptime: process.uptime() });
  });

  app.use("/api/v1", apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
