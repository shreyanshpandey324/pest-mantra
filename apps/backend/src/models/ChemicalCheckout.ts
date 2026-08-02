import { Schema, model, Document, Types } from "mongoose";

export interface IChemicalCheckout extends Document {
  _id: Types.ObjectId;
  technicianId: Types.ObjectId;
  chemicalId: Types.ObjectId;
  quantityIssued: number;
  issuedBy: Types.ObjectId;
  issuedAt: Date;
  returnQuantity?: number;
  returnedAt?: Date;
  returnedTo?: Types.ObjectId;
  createdAt: Date;
}

const chemicalCheckoutSchema = new Schema<IChemicalCheckout>(
  {
    technicianId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    chemicalId: { type: Schema.Types.ObjectId, ref: "Chemical", required: true },
    quantityIssued: { type: Number, required: true, min: 0 },
    issuedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    issuedAt: { type: Date, required: true },
    // Both left unset until the technician returns unused stock at
    // end of day — a checkout with returnedAt still unset is "open"
    // (the technician currently has this quantity out with them).
    returnQuantity: { type: Number, min: 0 },
    returnedAt: { type: Date },
    returnedTo: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// "What does this technician currently have checked out" is the
// hottest query (every checkout screen loads it) — served by this
// compound index with returnedAt unset as the filter.
chemicalCheckoutSchema.index({ technicianId: 1, returnedAt: 1 });
chemicalCheckoutSchema.index({ chemicalId: 1, issuedAt: 1 });

export const ChemicalCheckout = model<IChemicalCheckout>("ChemicalCheckout", chemicalCheckoutSchema);
