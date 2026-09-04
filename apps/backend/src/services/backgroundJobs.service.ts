import { randomUUID } from "crypto";
import { notificationAlertService } from "./notificationAlert.service";
import { communicationService } from "./communication.service";
import { SchedulerLease } from "../models/SchedulerLease";
import { logger } from "../utils/logger";

let timer: NodeJS.Timeout | undefined;
let running = false;
const instanceId = `${process.pid}-${randomUUID()}`;
const LEASE_KEY = "operations-sweep";

async function acquireLease(ttlMs: number): Promise<boolean> {
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + ttlMs);
  try {
    const lease = await SchedulerLease.findOneAndUpdate(
      { key: LEASE_KEY, $or: [{ lockedUntil: { $lt: now } }, { owner: instanceId }] },
      { $set: { owner: instanceId, lockedUntil }, $setOnInsert: { key: LEASE_KEY } },
      { new: true, upsert: true },
    );
    return lease?.owner === instanceId;
  } catch (error) {
    // A duplicate-key race means another instance acquired the lease first.
    if (typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 11000) return false;
    throw error;
  }
}

async function releaseLease(): Promise<void> {
  await SchedulerLease.updateOne({ key: LEASE_KEY, owner: instanceId }, { $set: { lockedUntil: new Date(0) } }).catch(() => undefined);
}

async function runOnce(intervalMinutes: number) {
  if (running) return;
  running = true;
  let leased = false;
  try {
    leased = await acquireLease(Math.max(2, intervalMinutes) * 60_000);
    if (!leased) {
      logger.info("Background sweep skipped: another application instance owns the scheduler lease");
      return;
    }
    const result = await notificationAlertService.runSweep();
    const delivery = await communicationService.processGlobalQueue();
    logger.info(`Background alert sweep complete: ${JSON.stringify(result.generatedFrom)}; outbox=${JSON.stringify(delivery)}`);
  } catch (error) {
    logger.error("Background alert sweep failed", error);
  } finally {
    if (leased) await releaseLease();
    running = false;
  }
}

export function startBackgroundJobs(enabled: boolean, intervalMinutes: number) {
  if (!enabled || timer) return;
  void runOnce(intervalMinutes);
  timer = setInterval(() => void runOnce(intervalMinutes), Math.max(1, intervalMinutes) * 60_000);
  timer.unref();
  logger.info(`Background jobs enabled (${Math.max(1, intervalMinutes)} minute interval, distributed lease protected)`);
}

export function stopBackgroundJobs() {
  if (timer) clearInterval(timer);
  timer = undefined;
}
