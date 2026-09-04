import path from "path";
import mongoose from "mongoose";

import {
  ProjectPhoto,
  IProjectPhoto,
  PhotoType,
} from "../models/ProjectPhoto";

import { projectService } from "./project.service";

import { CallerScope } from "../utils/callerScope";

import { ApiError } from "../utils/ApiError";

import { UserRole } from "../models/User";

import { UPLOAD_DIR } from "../middleware/upload.middleware";

function assertSafeUploadPath(
  filePath: string
): string {
  const uploadRoot = path.resolve(
    UPLOAD_DIR
  );

  const resolved = path.resolve(
    filePath
  );

  const relative = path.relative(
    uploadRoot,
    resolved
  );

  if (
    relative.startsWith("..") ||
    path.isAbsolute(relative)
  ) {
    throw ApiError.forbidden(
      "Invalid photo file path"
    );
  }

  return resolved;
}

function sanitizePhoto(
  photo: IProjectPhoto
): IProjectPhoto {
  const plain = photo.toObject();

  delete (
    plain as {
      storagePath?: string;
    }
  ).storagePath;

  return plain as IProjectPhoto;
}

export const photoService = {
  /**
   * Add a project photo.
   */
  async addPhoto(
    projectId: string,
    photoType: PhotoType,
    storagePath: string,
    scope: CallerScope
  ): Promise<IProjectPhoto> {
    /*
     * Verify project visibility first.
     *
     * This enforces:
     * - company isolation
     * - technician own-project isolation
     */
    const project =
      await projectService.getProjectById(
        projectId,
        scope
      );

    const safeStoragePath =
      assertSafeUploadPath(
        storagePath
      );

    if (
      !mongoose.Types.ObjectId.isValid(
        scope.userId
      )
    ) {
      throw ApiError.unauthorized(
        "Invalid user identity"
      );
    }

    const photoId =
      new mongoose.Types.ObjectId();

    const photo =
      await ProjectPhoto.create({
        _id: photoId,

        companyId:
          project.companyId,

        projectId:
          project._id,

        uploadedBy:
          new mongoose.Types.ObjectId(
            scope.userId
          ),

        photoType,

        fileUrl:
          `/api/v1/projects/${project._id.toString()}/photos/${photoId.toString()}`,

        storagePath:
          safeStoragePath,
      });

    return sanitizePhoto(photo);
  },

  /**
   * List project photos.
   */
  async listPhotos(
    projectId: string,
    scope: CallerScope
  ): Promise<IProjectPhoto[]> {
    await projectService.getProjectById(
      projectId,
      scope
    );

    const filter: Record<
      string,
      unknown
    > = {
      projectId:
        new mongoose.Types.ObjectId(
          projectId
        ),
    };

    if (
      scope.role !==
      UserRole.SUPER_ADMIN
    ) {
      if (!scope.companyId) {
        throw ApiError.forbidden(
          "Your account is not linked to a company"
        );
      }

      filter.companyId =
        new mongoose.Types.ObjectId(
          scope.companyId
        );
    }

    const photos =
      await ProjectPhoto.find(
        filter
      ).sort({
        uploadedAt: 1,
      });

    return photos.map(
      (photo) =>
        sanitizePhoto(photo)
    );
  },

  /**
   * Resolve a photo's physical
   * filesystem path after authorization.
   */
  async getPhotoFilePath(
    projectId: string,
    photoId: string,
    scope: CallerScope
  ): Promise<string> {
    if (
      !mongoose.Types.ObjectId.isValid(
        projectId
      )
    ) {
      throw ApiError.notFound(
        "Project not found"
      );
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        photoId
      )
    ) {
      throw ApiError.notFound(
        "Photo not found"
      );
    }

    /*
     * Most important authorization check:
     *
     * User must be able to access the
     * project before they can access
     * any photo belonging to it.
     */
    await projectService.getProjectById(
      projectId,
      scope
    );

    const filter: Record<
      string,
      unknown
    > = {
      _id:
        new mongoose.Types.ObjectId(
          photoId
        ),

      projectId:
        new mongoose.Types.ObjectId(
          projectId
        ),
    };

    if (
      scope.role !==
      UserRole.SUPER_ADMIN
    ) {
      if (!scope.companyId) {
        throw ApiError.forbidden(
          "Your account is not linked to a company"
        );
      }

      filter.companyId =
        new mongoose.Types.ObjectId(
          scope.companyId
        );
    }

    const photo =
      await ProjectPhoto.findOne(
        filter
      ).select(
        "+storagePath"
      );

    if (!photo) {
      throw ApiError.notFound(
        "Photo not found"
      );
    }

    if (!photo.storagePath) {
      throw ApiError.notFound(
        "Photo file not found"
      );
    }

    return assertSafeUploadPath(
      photo.storagePath
    );
  },
};
