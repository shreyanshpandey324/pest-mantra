import express, {
  Application,
} from "express";

import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import { env } from "./config/env";

import apiRoutes from "./routes";

import {
  errorHandler,
  notFoundHandler,
} from "./middleware/error.middleware";

import {
  globalRateLimiter,
} from "./middleware/rateLimit.middleware";

export function createApp(): Application {
  const app = express();

  /*
  |--------------------------------------------------------------------------
  | Proxy
  |--------------------------------------------------------------------------
  |
  | Trust the first reverse-proxy/load-balancer hop.
  | This is required for correct req.ip handling
  | and rate limiting behind a proxy.
  |
  */
  app.set(
    "trust proxy",
    1
  );

  /*
  |--------------------------------------------------------------------------
  | Security Headers
  |--------------------------------------------------------------------------
  */
  app.use(
    helmet({
      contentSecurityPolicy:
        env.isProduction
          ? undefined
          : false,
    })
  );

  /*
  |--------------------------------------------------------------------------
  | CORS
  |--------------------------------------------------------------------------
  */
  app.use(
    cors({
      origin:
        env.corsOrigins,
      credentials: true,
    })
  );

  /*
  |--------------------------------------------------------------------------
  | Request Body Parsing
  |--------------------------------------------------------------------------
  */
  app.use(
    express.json({
      limit: "1mb",
    })
  );

  app.use(
    express.urlencoded({
      extended: true,
      limit: "1mb",
    })
  );

  /*
  |--------------------------------------------------------------------------
  | Cookies
  |--------------------------------------------------------------------------
  */
  app.use(
    cookieParser()
  );

  /*
  |--------------------------------------------------------------------------
  | Development Logging
  |--------------------------------------------------------------------------
  */
  if (
    env.isDevelopment
  ) {
    app.use(
      morgan("dev")
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Global Rate Limiter
  |--------------------------------------------------------------------------
  */
  app.use(
    globalRateLimiter
  );

  /*
  |--------------------------------------------------------------------------
  | Health Check
  |--------------------------------------------------------------------------
  |
  | Kept outside /api/v1 so monitoring/load
  | balancers can check the application easily.
  |
  */
  app.get(
    "/health",
    (_req, res) => {
      res.status(200).json({
        success: true,
        message: "OK",
        uptime:
          process.uptime(),
      });
    }
  );

  /*
  |--------------------------------------------------------------------------
  | API
  |--------------------------------------------------------------------------
  */
  app.use(
    "/api/v1",
    apiRoutes
  );

  /*
  |--------------------------------------------------------------------------
  | 404 Handler
  |--------------------------------------------------------------------------
  */
  app.use(
    notFoundHandler
  );

  /*
  |--------------------------------------------------------------------------
  | Centralized Error Handler
  |--------------------------------------------------------------------------
  */
  app.use(
    errorHandler
  );

  return app;
}