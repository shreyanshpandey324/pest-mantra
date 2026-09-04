import { NextFunction, Response } from "express";
import mongoose from "mongoose";
import { AuthenticatedRequest } from "./auth.middleware";
import { AuditLog } from "../models/AuditLog";
import { logger } from "../utils/logger";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const SENSITIVE_KEYS = new Set(["password", "currentPassword", "newPassword", "confirmPassword", "token", "refreshToken", "idToken", "privateKey"]);

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 3) return "[truncated]";
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitize(item, depth + 1));
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>).slice(0, 40)) {
      output[key] =
        SENSITIVE_KEYS.has(key) ||
        /password|secret|token|private.?key|signature|authorization|access.?code/i.test(key)
          ? "[redacted]"
          : sanitize(child, depth + 1);
    }
    return output;
  }
  if (typeof value === "string" && value.length > 500) return `${value.slice(0, 500)}…`;
  return value;
}

function parseEntity(path: string) {
  const clean = path.replace(/^\/api\/v1\//, "").split("?")[0];
  const parts = clean.split("/").filter(Boolean);
  const entityType = parts[0];
  const maybeId = parts[1];
  const entityId = maybeId && (/^[a-f\d]{24}$/i.test(maybeId) || /^[A-Z]{2,}-/i.test(maybeId)) ? maybeId : undefined;
  const suffix = parts.slice(entityId ? 2 : 1).join("/");
  return { entityType, entityId, suffix };
}

function actionLabel(method: string, entityType?: string, suffix?: string) {
  const verb = method === "POST" ? "create" : method === "DELETE" ? "delete" : "update";
  return [verb, entityType?.replace(/-/g, " "), suffix?.replace(/\//g, " ")].filter(Boolean).join(" · ");
}

export function auditMutationMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!MUTATION_METHODS.has(req.method) || req.path.startsWith("/api/v1/auth")) return next();
  const startedAt = Date.now();
  res.on("finish", () => {
    if (!req.user || res.statusCode >= 400) return;
    const { entityType, entityId, suffix } = parseEntity(req.originalUrl || req.url);
    const companyId = req.user.companyId && mongoose.Types.ObjectId.isValid(req.user.companyId) ? req.user.companyId : undefined;
    const branchId = req.user.branchId && mongoose.Types.ObjectId.isValid(req.user.branchId) ? req.user.branchId : undefined;
    void AuditLog.create({
      companyId,
      branchId,
      actorId: req.user.id,
      actorRole: req.user.role,
      method: req.method,
      path: (req.originalUrl || req.url).slice(0, 500),
      action: actionLabel(req.method, entityType, suffix),
      entityType,
      entityId,
      statusCode: res.statusCode,
      ip: req.ip,
      userAgent: req.get("user-agent")?.slice(0, 500),
      metadata: { body: sanitize(req.body), durationMs: Date.now() - startedAt },
    }).catch((error) => logger.error("Failed to write audit log", error));
  });
  next();
}
