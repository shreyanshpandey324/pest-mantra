import multer from "multer";
import path from "path";
import crypto from "crypto";
import { mkdirSync, promises as fs } from "fs";
import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";
import { env } from "../config/env";

const UPLOAD_DIR = env.UPLOAD_DIR
  ? path.resolve(env.UPLOAD_DIR)
  : path.join(__dirname, "..", "..", "uploads");

// Multer does not create its disk destination. A clean deployment must be
// able to accept its first photo or receipt without an ENOENT failure.
mkdirSync(UPLOAD_DIR, { recursive: true });
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB — generous for a compressed phone photo
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MIME_EXTENSIONS = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);

/**
 * MVP storage: local disk. This is fine for a single-server dev/
 * staging setup but will NOT work once the app runs on more than
 * one server instance (each instance would only see its own disk).
 * Before real production rollout, swap this for direct-to-S3/R2
 * pre-signed uploads as the architecture doc specifies — the
 * photo.service.ts call site is the only place that would need to
 * change (it just needs a fileUrl string, wherever it comes from).
 */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(16).toString("hex");
    // Never trust the user-supplied filename extension. A trusted extension
    // keeps a disguised HTML/SVG file from later being served as executable
    // content by res.sendFile.
    const ext = MIME_EXTENSIONS.get(file.mimetype) ?? ".img";
    cb(null, `${Date.now()}-${uniqueSuffix}${ext}`);
  },
});

function fileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(new ApiError(400, "Only JPEG, PNG, or WEBP images are allowed"));
    return;
  }
  cb(null, true);
}

async function validateImageSignature(file: Express.Multer.File): Promise<void> {
  const handle = await fs.open(file.path, "r");
  const header = Buffer.alloc(12);
  try {
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    const isJpeg =
      file.mimetype === "image/jpeg" &&
      bytesRead >= 3 &&
      header[0] === 0xff &&
      header[1] === 0xd8 &&
      header[2] === 0xff;
    const isPng =
      file.mimetype === "image/png" &&
      bytesRead >= 8 &&
      header.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"));
    const isWebp =
      file.mimetype === "image/webp" &&
      bytesRead >= 12 &&
      header.toString("ascii", 0, 4) === "RIFF" &&
      header.toString("ascii", 8, 12) === "WEBP";

    if (!isJpeg && !isPng && !isWebp) {
      throw ApiError.badRequest("The uploaded file is not a valid JPEG, PNG, or WEBP image");
    }
  } finally {
    await handle.close();
  }
}

function continueAfterImageValidation(
  req: Request,
  next: NextFunction,
): void {
  if (!req.file) {
    next();
    return;
  }

  const uploadedPath = req.file.path;
  void validateImageSignature(req.file)
    .then(() => next())
    .catch(async (error: unknown) => {
      await fs.unlink(uploadedPath).catch(() => undefined);
      req.file = undefined;
      next(error);
    });
}

const uploadPhoto = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
}).single("photo");

/**
 * Multer isn't promise-based, so its errors don't flow through
 * asyncHandler the way the rest of the app's errors do. This
 * wraps it once, here, translating multer's own error codes into
 * the same ApiError shape every other endpoint uses — so a client
 * gets a consistent {success:false, message} response whether the
 * failure was "file too big" or "validation failed", not a raw
 * multer error shape in one case and ApiError JSON in every other.
 */
export function handlePhotoUpload(req: Request, res: Response, next: NextFunction): void {
  uploadPhoto(req, res, (err: unknown) => {
    if (!err) return continueAfterImageValidation(req, next);

    if (err instanceof multer.MulterError) {
      const messages: Record<string, string> = {
        LIMIT_FILE_SIZE: "Photo is too large — maximum size is 8MB",
        LIMIT_FILE_COUNT: "Only one photo can be uploaded per request",
        LIMIT_UNEXPECTED_FILE: "Unexpected file field — expected field name 'photo'",
      };
      return next(new ApiError(400, messages[err.code] ?? "Photo upload failed"));
    }

    // Anything else (e.g. our own fileFilter ApiError for a
    // disallowed mime type) is already the right shape — pass it
    // straight through to the centralized error handler.
    next(err);
  });
}

const uploadExpenseReceipt = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
}).single("receipt");

export function handleExpenseReceiptUpload(req: Request, res: Response, next: NextFunction): void {
  uploadExpenseReceipt(req, res, (err: unknown) => {
    if (!err) return continueAfterImageValidation(req, next);
    if (err instanceof multer.MulterError) {
      const messages: Record<string, string> = {
        LIMIT_FILE_SIZE: "Receipt is too large — maximum size is 8MB",
        LIMIT_FILE_COUNT: "Only one receipt can be uploaded per request",
        LIMIT_UNEXPECTED_FILE: "Unexpected file field — expected field name 'receipt'",
      };
      return next(new ApiError(400, messages[err.code] ?? "Receipt upload failed"));
    }
    next(err);
  });
}

export { UPLOAD_DIR };
