/**
 * Minimal structured logger.
 * Kept dependency-free for Module 1; swap for pino/winston later
 * without touching call sites since the interface is small and stable.
 */
type LogMeta = Record<string, unknown> | unknown;

function timestamp(): string {
  return new Date().toISOString();
}

export const logger = {
  info(message: string, meta?: LogMeta): void {
    // eslint-disable-next-line no-console
    console.log(`[${timestamp()}] INFO  ${message}`, meta ?? "");
  },
  warn(message: string, meta?: LogMeta): void {
    // eslint-disable-next-line no-console
    console.warn(`[${timestamp()}] WARN  ${message}`, meta ?? "");
  },
  error(message: string, meta?: LogMeta): void {
    // eslint-disable-next-line no-console
    console.error(`[${timestamp()}] ERROR ${message}`, meta ?? "");
  },
};
