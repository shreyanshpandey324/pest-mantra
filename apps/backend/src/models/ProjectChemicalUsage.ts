import { Schema, model, Document, Types } from "mongoose";

export interface IProjectChemicalUsage extends Document {
  _id: Types.ObjectId;
  projectId: Types.ObjectId;
  chemicalId: Types.ObjectId;
  quantityUsed: number;
  loggedBy: Types.ObjectId;
  loggedAt: Date;
}

const projectChemicalUsageSchema = new Schema<IProjectChemicalUsage>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    chemicalId: { type: Schema.Types.ObjectId, ref: "Chemical", required: true },
    quantityUsed: { type: Number, required: true, min: 0 },
    loggedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: "loggedAt", updatedAt: false } }
);

// "What was used on this job" (project detail view) and "how much
// of this chemical has been used across all jobs" (reporting) are
// the two real query patterns.
projectChemicalUsageSchema.index({ projectId: 1 });
projectChemicalUsageSchema.index({ chemicalId: 1, loggedAt: 1 });

export const ProjectChemicalUsage = model<IProjectChemicalUsage>(
  "ProjectChemicalUsage",
  projectChemicalUsageSchema
);
