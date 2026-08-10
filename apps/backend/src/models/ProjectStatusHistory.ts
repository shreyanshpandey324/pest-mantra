import {
  Schema,
  model,
  Document,
  Types,
} from "mongoose";
import { ProjectStatus } from "./Project";

export interface IProjectStatusHistory
  extends Document {
  _id: Types.ObjectId;
  companyId?: Types.ObjectId;
  projectId: Types.ObjectId;
  fromStatus: ProjectStatus | null;
  toStatus: ProjectStatus;
  changedBy: Types.ObjectId;
  changedAt: Date;
  remarks?: string;
}

const projectStatusHistorySchema =
  new Schema<IProjectStatusHistory>(
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
      },

      fromStatus: {
        type: String,
        enum: Object.values(ProjectStatus),
        default: null,
      },

      toStatus: {
        type: String,
        enum: Object.values(ProjectStatus),
        required: true,
      },

      changedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      remarks: {
        type: String,
        trim: true,
        maxlength: 500,
      },
    },
    {
      timestamps: {
        createdAt: "changedAt",
        updatedAt: false,
      },
    }
  );

projectStatusHistorySchema.index({
  companyId: 1,
  projectId: 1,
  changedAt: 1,
});

export const ProjectStatusHistory =
  model<IProjectStatusHistory>(
    "ProjectStatusHistory",
    projectStatusHistorySchema
  );