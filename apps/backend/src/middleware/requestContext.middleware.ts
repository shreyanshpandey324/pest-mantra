import { NextFunction, Request, Response } from "express";
import { randomUUID } from "crypto";

export function requestContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header("x-request-id")?.trim();
  const requestId = incoming && incoming.length <= 120 ? incoming : randomUUID();
  res.setHeader("X-Request-ID", requestId);
  res.locals.requestId = requestId;
  next();
}
