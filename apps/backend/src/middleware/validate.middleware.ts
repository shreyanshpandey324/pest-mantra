import { NextFunction, Request, Response } from "express";
import { ZodError, ZodTypeAny } from "zod";
import { ApiError } from "../utils/ApiError";

/**
 * Validates req.body against any Zod schema, including schemas wrapped by
 * refine/superRefine. This keeps route validation reusable without forcing
 * every schema to be a bare ZodObject.
 */
export function validateBody(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(
          ApiError.badRequest("Validation failed", err.flatten().fieldErrors),
        );
      }
      next(err);
    }
  };
}

/** Same idea as validateBody, for query-string params. */
export function validateQuery(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as unknown as Request["query"];
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(
          ApiError.badRequest(
            "Invalid query parameters",
            err.flatten().fieldErrors,
          ),
        );
      }
      next(err);
    }
  };
}
