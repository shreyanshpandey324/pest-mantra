import { NextFunction, Request, Response } from "express";

type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

/**
 * Wraps an async controller so any thrown/rejected error is
 * forwarded to Express's error-handling middleware via next(err),
 * instead of every controller needing its own try/catch block.
 * This is the single mechanism that eliminates repeated
 * try/catch/next(err) duplication across all controllers.
 */
export function asyncHandler(handler: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
