import { Schema, model, Document, Types } from "mongoose";

export enum ChemicalUnit {
  LITRE = "litre",
  KG = "kg",
  PIECE = "piece",
  ML = "ml",
  GRAM = "gram",
}

export interface IChemical extends Document {
  _id: Types.ObjectId;
  name: string;
  unit: ChemicalUnit;
  currentStock: number;
  lowStockThreshold: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const chemicalSchema = new Schema<IChemical>(
  {
    name: { type: String, required: true, trim: true, unique: true, minlength: 2, maxlength: 100 },
    unit: { type: String, enum: Object.values(ChemicalUnit), required: true },
    currentStock: { type: Number, required: true, default: 0, min: 0 },
    // Below this, the admin dashboard flags the item so office
    // staff can reorder before a technician turns up with nothing
    // to check out — a plain number, editable per chemical since
    // usage rates differ a lot between e.g. termite fluid and bait.
    lowStockThreshold: { type: Number, required: true, default: 5, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

chemicalSchema.index({ isActive: 1, name: 1 });

export const Chemical = model<IChemical>("Chemical", chemicalSchema);
