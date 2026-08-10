import {
  Response,
} from "express";

import fs from "fs";
import path from "path";

import {
  asyncHandler,
} from "../utils/asyncHandler";

import {
  sendSuccess,
} from "../utils/ApiResponse";

import {
  ApiError,
} from "../utils/ApiError";

import {
  getCallerScope,
} from "../utils/callerScope";

import {
  photoService,
} from "../services/photo.service";

import {
  photoUploadBodySchema,
} from "../validators/project.validators";

import {
  AuthenticatedRequest,
} from "../middleware/auth.middleware";

import {
  UPLOAD_DIR,
} from "../middleware/upload.middleware";

export const photoController = {
  /**
   * ------------------------------------------------------------
   * UPLOAD PROJECT PHOTO
   * ------------------------------------------------------------
   */
  upload: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      const scope =
        getCallerScope(req);

      if (!req.file) {
        throw ApiError.badRequest(
          "No photo file was uploaded (expected field name 'photo')"
        );
      }

      const parsed =
        photoUploadBodySchema.safeParse(
          req.body
        );

      if (!parsed.success) {
        /*
         * Multer has already written the
         * file, so remove it when body
         * validation fails.
         */
        try {
          await fs.promises.unlink(
            req.file.path
          );
        } catch {
          // Ignore cleanup failure.
        }

        throw ApiError.badRequest(
          "Validation failed",
          parsed.error.flatten()
            .fieldErrors
        );
      }

      const {
        photoType,
      } = parsed.data;

      const storagePath =
        path.resolve(
          req.file.path
        );

      try {
        const photo =
          await photoService.addPhoto(
            req.params.id,
            photoType,
            storagePath,
            scope
          );

        sendSuccess(
          res,
          201,
          "Photo uploaded",
          {
            photo,
          }
        );
      } catch (err) {
        /*
         * If authorization or database
         * creation fails, don't leave an
         * orphaned file on disk.
         */
        try {
          await fs.promises.unlink(
            storagePath
          );
        } catch {
          // Ignore cleanup failure.
        }

        throw err;
      }
    }
  ),

  /**
   * ------------------------------------------------------------
   * LIST PROJECT PHOTOS
   * ------------------------------------------------------------
   */
  list: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      const scope =
        getCallerScope(req);

      const photos =
        await photoService.listPhotos(
          req.params.id,
          scope
        );

      sendSuccess(
        res,
        200,
        "Photos",
        {
          photos,
        }
      );
    }
  ),

  /**
   * ------------------------------------------------------------
   * SECURE PHOTO FILE
   * ------------------------------------------------------------
   */
  file: asyncHandler(
    async (
      req: AuthenticatedRequest,
      res: Response
    ) => {
      const scope =
        getCallerScope(req);

      const filePath =
        await photoService.getPhotoFilePath(
          req.params.id,
          req.params.photoId,
          scope
        );

      /*
       * Verify that the physical file
       * still exists and is readable.
       */
      try {
        await fs.promises.access(
          filePath,
          fs.constants.R_OK
        );
      } catch {
        throw ApiError.notFound(
          "Photo file not found"
        );
      }

      /*
       * Final path traversal protection.
       */
      const uploadRoot =
        path.resolve(
          UPLOAD_DIR
        );

      const resolvedFile =
        path.resolve(
          filePath
        );

      const relative =
        path.relative(
          uploadRoot,
          resolvedFile
        );

      if (
        relative.startsWith("..") ||
        path.isAbsolute(relative)
      ) {
        throw ApiError.forbidden(
          "Invalid photo file path"
        );
      }

      res.sendFile(
        resolvedFile,
        {
          dotfiles: "deny",
          acceptRanges: true,
          cacheControl: true,
          maxAge: "1h",
        },
        (err) => {
          if (
            err &&
            !res.headersSent
          ) {
            res
              .status(404)
              .end();
          }
        }
      );
    }
  ),
};