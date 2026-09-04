import mongoose from "mongoose";
import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { env } from "../config/env";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/ApiResponse";

export const systemController = {
  capabilities: asyncHandler(async (_req: AuthenticatedRequest, res: Response) => {
    const firebaseConfigured = Boolean(env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY);
    const communicationConfigured = env.communicationProvider === "webhook" && Boolean(env.COMMUNICATION_WEBHOOK_URL);
    const databaseConnected = mongoose.connection.readyState === 1;
    sendSuccess(res, 200, "System capabilities", {
      mode: "real",
      database: { status: databaseConnected ? "ready" : "not_ready", provider: "MongoDB" },
      authentication: { admin: "mobile + password", technicianOtp: firebaseConfigured ? "configured" : "configuration required" },
      communications: { status: communicationConfigured ? "configured" : "provider ready", provider: env.communicationProvider, channels: ["whatsapp", "sms", "email"] },
      backgroundJobs: { enabled: env.backgroundJobsEnabled, intervalMinutes: env.BACKGROUND_JOB_INTERVAL_MINUTES, distributedLease: true },
      storage: { status: "local", productionRecommendation: "S3 / Cloudflare R2 / Cloudinary" },
      payments: { status: "manual ledger", providerReady: true, productionRecommendation: "Razorpay / Stripe webhook integration" },
      pwa: { technicianInstallable: true, offlineShell: true, fullOfflineSync: false },
      observability: { healthEndpoint: "/health", readinessEndpoint: "/ready", requestIds: true, auditLog: true },
    });
  }),
};
