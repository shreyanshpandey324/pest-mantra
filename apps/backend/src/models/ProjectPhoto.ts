import {
  Schema,
  model,
  Document,
  Types,
} from "mongoose";

export enum PhotoType {
  BEFORE = "before",
  AFTER = "after",
}

export interface IProjectPhoto
  extends Document {
  _id: Types.ObjectId;

  companyId?: Types.ObjectId;

  projectId: Types.ObjectId;

  uploadedBy: Types.ObjectId;

  photoType: PhotoType;

  fileUrl: string;

  storagePath: string;

  uploadedAt: Date;
}

const projectPhotoSchema =
  new Schema(
    {
      companyId: {
        type: Schema.Types.ObjectId,
        ref: "Company",
        index: true,
      },

      projectId: {
        type: Schema.Types.ObjectId,
        ref: "Project",
        required: true,
        index: true,
      },

      uploadedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      photoType: {
        type: String,
        enum: Object.values(
          PhotoType
        ),
        required: true,
      },

      /*
       * Public/API URL.
       *
       * This is NOT a filesystem path.
       */
      fileUrl: {
        type: String,
        required: true,
      },

      /*
       * Internal filesystem location.
       *
       * Never expose this value to clients.
       */
      storagePath: {
        type: String,
        required: true,
        select: false,
      },
    },
    {
      timestamps: {
        createdAt: "uploadedAt",
        updatedAt: false,
      },
    }
  );

projectPhotoSchema.index({
  companyId: 1,
  projectId: 1,
  photoType: 1,
});

projectPhotoSchema.index({
  projectId: 1,
  uploadedAt: 1,
});

export const ProjectPhoto =
  model<IProjectPhoto>(
    "ProjectPhoto",
    projectPhotoSchema
  );