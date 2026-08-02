import { Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { sendSuccess } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { getCallerScope } from "../utils/callerScope";
import { photoService } from "../services/photo.service";
import { photoUploadBodySchema } from "../validators/project.validators";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

export const photoController = {
  upload: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const scope = getCallerScope(req);

    if (!req.file) {
      throw ApiError.badRequest("No photo file was uploaded (expected field name 'photo')");
    }

    const parsed = photoUploadBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.badRequest("Validation failed", parsed.error.flatten().fieldErrors);
    }
    const { photoType } = parsed.data;

    // Served back via the static /uploads route registered in
    // app.ts. See upload.middleware.ts for the production caveat
    // on this local-disk MVP approach.
    const fileUrl = `/uploads/${req.file.filename}`;

    const photo = await photoService.addPhoto(req.params.id, photoType, fileUrl, scope);
    sendSuccess(res, 201, "Photo uploaded", { photo });
  }),

  list: asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const scope = getCallerScope(req);
    const photos = await photoService.listPhotos(req.params.id, scope);
    sendSuccess(res, 200, "Photos", { photos });
  }),
};
