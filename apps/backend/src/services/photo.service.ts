import { ProjectPhoto, IProjectPhoto, PhotoType } from "../models/ProjectPhoto";
import { projectService } from "./project.service";
import { CallerScope } from "../utils/callerScope";

export const photoService = {
  async addPhoto(
    projectId: string,
    photoType: PhotoType,
    fileUrl: string,
    scope: CallerScope
  ): Promise<IProjectPhoto> {
    // Reuses the exact same visibility check every other
    // project-scoped read/write goes through — a technician
    // cannot attach a photo to a job that isn't theirs.
    await projectService.getProjectById(projectId, scope);

    return ProjectPhoto.create({
      projectId,
      uploadedBy: scope.userId,
      photoType,
      fileUrl,
    });
  },

  async listPhotos(projectId: string, scope: CallerScope): Promise<IProjectPhoto[]> {
    await projectService.getProjectById(projectId, scope);
    return ProjectPhoto.find({ projectId }).sort({ uploadedAt: 1 });
  },
};
