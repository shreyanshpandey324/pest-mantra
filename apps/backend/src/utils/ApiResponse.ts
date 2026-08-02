import { Response } from "express";

/**
 * Every successful response goes through this helper so the
 * frontend can rely on one consistent envelope shape:
 * { success: true, message, data }
 */
export function sendSuccess<T>(
  res: Response,
  statusCode: number,
  message: string,
  data?: T
): Response {
  return res.status(statusCode).json({
    success: true,
    message,
    data: data ?? null,
  });
}
