import { NextFunction, Request, Response } from "express";
import { AnyZodObject, ZodError } from "zod";
import { ApiError } from "../utils/ApiError";

/**
 * Validates req.body against a Zod schema. One middleware, reused
 * by every route that needs input validation — this is what keeps
 * validation logic out of controllers and non-duplicated.
 */
export function validateBody(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(ApiError.badRequest("Validation failed", err.flatten().fieldErrors));
      }
      next(err);
    }
  };
}

/** Same idea as validateBody, for query-string params (e.g. GET /projects?status=new). */
export function validateQuery(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      // Cast: Express's req.query type doesn't accept a replaced
      // object directly, but this is the standard, safe way to swap
      // in the parsed/typed version for downstream handlers.
      req.query = schema.parse(req.query) as unknown as Request["query"];
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(ApiError.badRequest("Invalid query parameters", err.flatten().fieldErrors));
      }
      next(err);
    }
  };
}
