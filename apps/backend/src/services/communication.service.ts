import mongoose from "mongoose";
import { env } from "../config/env";
import { NotificationAlert } from "../models/NotificationAlert";
import { IOutboundMessage, OutboundChannel, OutboundMessage, OutboundStatus } from "../models/OutboundMessage";
import { UserRole } from "../models/User";
import { ApiError } from "../utils/ApiError";
import { CallerScope } from "../utils/callerScope";

function tenantFilter(scope: CallerScope): Record<string, unknown> {
  if (scope.role === UserRole.SUPER_ADMIN) return {};
  if (!scope.companyId || !scope.branchId) throw ApiError.forbidden("Company and branch context are required");
  return { companyId: new mongoose.Types.ObjectId(scope.companyId), branchId: new mongoose.Types.ObjectId(scope.branchId) };
}

function normalisePhone(value: string): string {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) throw ApiError.badRequest("Recipient phone number is invalid");
  if (trimmed.startsWith("+")) return `+${digits}`;
  return digits.length === 10 ? `+91${digits}` : `+${digits}`;
}

const PROCESSING_STALE_MS = 2 * 60 * 1000;

function retryableDeliveryFilter(now = new Date()) {
  return {
    $or: [
      { status: { $in: [OutboundStatus.QUEUED, OutboundStatus.WAITING_CONFIGURATION] } },
      {
        status: OutboundStatus.PROCESSING,
        lastAttemptAt: { $lt: new Date(now.getTime() - PROCESSING_STALE_MS) },
      },
    ],
  };
}

async function deliver(item: IOutboundMessage): Promise<IOutboundMessage> {
  if (item.status === OutboundStatus.SENT || item.status === OutboundStatus.FAILED) {
    return item;
  }

  if (env.communicationProvider !== "webhook" || !env.COMMUNICATION_WEBHOOK_URL) {
    item.status = OutboundStatus.WAITING_CONFIGURATION;
    item.provider = "disabled";
    item.lastError = "No live communication webhook is configured";
    return item.save();
  }

  const now = new Date();
  const claimed = await OutboundMessage.findOneAndUpdate(
    {
      _id: item._id,
      attempts: { $lt: env.COMMUNICATION_MAX_ATTEMPTS },
      ...retryableDeliveryFilter(now),
    },
    {
      $set: {
        status: OutboundStatus.PROCESSING,
        provider: "webhook",
        lastAttemptAt: now,
      },
      $inc: { attempts: 1 },
    },
    { new: true },
  );

  if (!claimed) {
    const current = await OutboundMessage.findById(item._id);
    if (
      current &&
      current.status !== OutboundStatus.SENT &&
      current.status !== OutboundStatus.FAILED &&
      current.attempts >= env.COMMUNICATION_MAX_ATTEMPTS
    ) {
      current.status = OutboundStatus.FAILED;
      current.lastError ||= "Maximum delivery attempts reached";
      return current.save();
    }
    return current ?? item;
  }

  try {
    const response = await fetch(env.COMMUNICATION_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-idempotency-key": claimed._id.toString(),
        ...(env.COMMUNICATION_WEBHOOK_SECRET ? { "x-pest-mantra-secret": env.COMMUNICATION_WEBHOOK_SECRET } : {}),
      },
      body: JSON.stringify({
        id: claimed._id.toString(),
        channel: claimed.channel,
        recipient: claimed.recipient,
        subject: claimed.subject,
        message: claimed.message,
        relatedType: claimed.relatedType,
        relatedId: claimed.relatedId?.toString(),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Provider webhook returned HTTP ${response.status}`);
    claimed.status = OutboundStatus.SENT;
    claimed.sentAt = new Date();
    claimed.lastError = undefined;
  } catch (error) {
    claimed.status = claimed.attempts >= env.COMMUNICATION_MAX_ATTEMPTS ? OutboundStatus.FAILED : OutboundStatus.QUEUED;
    claimed.lastError = error instanceof Error ? error.message : "Communication provider failed";
  }
  return claimed.save();
}

export const communicationService = {
  status() {
    return {
      provider: env.communicationProvider,
      configured: env.communicationProvider === "webhook" && Boolean(env.COMMUNICATION_WEBHOOK_URL),
      supportedChannels: Object.values(OutboundChannel),
      note: env.communicationProvider === "webhook" ? "Generic secure webhook delivery is enabled" : "Provider-ready outbox is enabled; live delivery awaits a webhook provider",
    };
  },

  async queueFromAlert(alertId: string, channel: OutboundChannel, scope: CallerScope) {
    if (!mongoose.Types.ObjectId.isValid(alertId)) throw ApiError.notFound("Alert not found");
    const alert = await NotificationAlert.findOne({ _id: alertId, ...tenantFilter(scope) });
    if (!alert) throw ApiError.notFound("Alert not found");
    if (channel === OutboundChannel.EMAIL) throw ApiError.badRequest("This alert does not contain a customer email address");
    if (!alert.customerPhone) throw ApiError.badRequest("Customer phone is not available for this alert");

    const recipient = normalisePhone(alert.customerPhone);
    const dedupeKey = `alert:${alert._id.toString()}:${channel}`;
    const message = await OutboundMessage.findOneAndUpdate(
      { dedupeKey },
      { $setOnInsert: {
        companyId: alert.companyId,
        branchId: alert.branchId,
        channel,
        recipient,
        message: `${alert.title}: ${alert.message}`,
        relatedType: alert.relatedType,
        relatedId: alert.relatedId,
        dedupeKey,
        status: OutboundStatus.QUEUED,
        provider: env.communicationProvider,
      } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    if (!message) throw ApiError.internal("Could not create outbound message");
    return env.communicationProvider === "webhook" ? deliver(message) : message;
  },

  async queueAutomatedAlert(alert: { _id: mongoose.Types.ObjectId; companyId?: mongoose.Types.ObjectId; branchId?: mongoose.Types.ObjectId; customerPhone?: string; title: string; message: string; relatedType?: string; relatedId?: mongoose.Types.ObjectId }, channel: OutboundChannel, dedupeSuffix: string) {
    if (channel === OutboundChannel.EMAIL || !alert.customerPhone) return null;
    const recipient = normalisePhone(alert.customerPhone);
    const dedupeKey = `automation:${alert._id.toString()}:${channel}:${dedupeSuffix}`;
    const message = await OutboundMessage.findOneAndUpdate(
      { dedupeKey },
      { $setOnInsert: { companyId: alert.companyId, branchId: alert.branchId, channel, recipient, message: `${alert.title}: ${alert.message}`, relatedType: alert.relatedType, relatedId: alert.relatedId, dedupeKey, status: OutboundStatus.QUEUED, provider: env.communicationProvider } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    if (!message) return null;
    return env.communicationProvider === "webhook" ? deliver(message) : message;
  },

  async list(scope: CallerScope, limit = 50) {
    return OutboundMessage.find(tenantFilter(scope)).sort({ createdAt: -1 }).limit(Math.min(100, Math.max(1, limit))).lean();
  },

  async processQueue(scope: CallerScope) {
    const rows = await OutboundMessage.find({ ...tenantFilter(scope), ...retryableDeliveryFilter() }).sort({ createdAt: 1 }).limit(50);
    if (env.communicationProvider !== "webhook") return { processed: 0, waitingConfiguration: rows.length };
    let sent = 0; let failed = 0;
    for (const row of rows) {
      const delivered = await deliver(row);
      if (delivered.status === OutboundStatus.SENT) sent += 1;
      if (delivered.status === OutboundStatus.FAILED) failed += 1;
    }
    return { processed: rows.length, sent, failed };
  },

  async processGlobalQueue() {
    const rows = await OutboundMessage.find(retryableDeliveryFilter()).sort({ createdAt: 1 }).limit(100);
    if (env.communicationProvider !== "webhook") return { processed: 0, waitingConfiguration: rows.length };
    let sent = 0; let failed = 0;
    for (const row of rows) {
      const delivered = await deliver(row);
      if (delivered.status === OutboundStatus.SENT) sent += 1;
      if (delivered.status === OutboundStatus.FAILED) failed += 1;
    }
    return { processed: rows.length, sent, failed };
  },
};
