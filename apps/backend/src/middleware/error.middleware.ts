import { NextFunction, Request, Response } from "express";
import multer from "multer";
import { ApiError } from "../utils/ApiError";
import { env } from "../config/env";
import { logger } from "../utils/logger";

/**
 * Single place where every error in the app is turned into an
 * HTTP response. Controllers just `throw ApiError...` and this
 * middleware (registered last) handles the rest. Never leaks
 * stack traces or internal details in production.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    if (!err.isOperational) {
      logger.error(`Unhandled operational error at ${req.method} ${req.path}`, err);
    }
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details: err.details,
      ...(env.isDevelopment ? { stack: err.stack } : {}),
    });
    return;
  }

  // Defense in depth: handle_photo_upload already translates these
  // to ApiError before they'd normally get here, but if some other
  // multer-using route is added later without that wrapper, this
  // still keeps the response shape consistent instead of a 500.
  if (err instanceof multer.MulterError) {
    res.status(400).json({
      success: false,
      message: "File upload failed: " + err.message,
    });
    return;
  }

  // Mongoose cast error — most commonly a malformed ObjectId in a
  // route param (e.g. GET /projects/not-a-real-id). Without this,
  // every :id-based route (there are several in Module 2) would
  // return a generic, unhelpful 500 for a simple bad-input case
  // that's really a 400.
  if (err instanceof Error && err.name === "CastError") {
    res.status(400).json({
      success: false,
      message: "Invalid id format",
    });
    return;
  }

  // Mongoose duplicate key error
  if (typeof err === "object" && err !== null && "code" in err && (err as { code: unknown }).code === 11000) {
    res.status(409).json({
      success: false,
      message: "A record with these details already exists",
    });
    return;
  }

  // Mongoose validation error
  if (err instanceof Error && err.name === "ValidationError") {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      details: err.message,
    });
    return;
  }

  // Mongoose cast error — most commonly a malformed ObjectId in a
  // URL param (e.g. GET /projects/not-a-real-id). Without this,
  // every such request would fall through to the generic 500 below,
  // which is misleading — this is a client input error, not a
  // server failure.
  if (err instanceof Error && err.name === "CastError") {
    res.status(400).json({
      success: false,
      message: "Invalid ID format",
    });
    return;
  }

  logger.error(`Unexpected error at ${req.method} ${req.path}`, err);

  res.status(500).json({
    success: false,
    message: env.isDevelopment && err instanceof Error ? err.message : "Internal server error",
    ...(env.isDevelopment && err instanceof Error ? { stack: err.stack } : {}),
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}
