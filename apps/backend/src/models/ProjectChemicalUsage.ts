import { Schema, model, Document, Types } from "mongoose";

export interface IProjectChemicalUsage
  extends Document {
  _id: Types.ObjectId;
  companyId?: Types.ObjectId;
  projectId: Types.ObjectId;
  chemicalId: Types.ObjectId;
  quantityUsed: number;
  loggedBy: Types.ObjectId;
  loggedAt: Date;
}

const projectChemicalUsageSchema =
  new Schema<IProjectChemicalUsage>(
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

      chemicalId: {
        type: Schema.Types.ObjectId,
        ref: "Chemical",
        required: true,
      },

      quantityUsed: {
        type: Number,
        required: true,
        min: 0,
      },

      loggedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    },
    {
      timestamps: {
        createdAt: "loggedAt",
        updatedAt: false,
      },
    }
  );

projectChemicalUsageSchema.index({
  companyId: 1,
  projectId: 1,
});

projectChemicalUsageSchema.index({
  companyId: 1,
  chemicalId: 1,
  loggedAt: 1,
});

export const ProjectChemicalUsage =
  model<IProjectChemicalUsage>(
    "ProjectChemicalUsage",
    projectChemicalUsageSchema
  );