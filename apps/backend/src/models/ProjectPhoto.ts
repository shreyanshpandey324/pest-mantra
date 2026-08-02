import { Schema, model, Document, Types } from "mongoose";

export enum PhotoType {
  BEFORE = "before",
  AFTER = "after",
}

export interface IProjectPhoto extends Document {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  uploadedBy: Types.ObjectId;
  photoType: PhotoType;
  fileUrl: string;
  uploadedAt: Date;
}

const projectPhotoSchema = new Schema<IProjectPhoto>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    photoType: { type: String, enum: Object.values(PhotoType), required: true },
    fileUrl: { type: String, required: true },
  },
  { timestamps: { createdAt: "uploadedAt", updatedAt: false } }
);

// Supports "give me this project's before photos" / "after photos"
// without a full collection scan filtered in application code.
projectPhotoSchema.index({ projectId: 1, photoType: 1 });

export const ProjectPhoto = model<IProjectPhoto>("ProjectPhoto", projectPhotoSchema);
