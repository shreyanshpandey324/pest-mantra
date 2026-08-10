import {
  Schema,
  model,
  Document,
  Types,
} from "mongoose";

export interface IChemicalCheckout
  extends Document {
  _id: Types.ObjectId;

  companyId?: Types.ObjectId;

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

const chemicalCheckoutSchema =
  new Schema<IChemicalCheckout>(
    {
      companyId: {
        type: Schema.Types.ObjectId,
        ref: "Company",
        index: true,
      },

      technicianId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      chemicalId: {
        type: Schema.Types.ObjectId,
        ref: "Chemical",
        required: true,
        index: true,
      },

      quantityIssued: {
        type: Number,
        required: true,
        min: 0,
      },

      issuedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      issuedAt: {
        type: Date,
        required: true,
        default: Date.now,
      },

      returnQuantity: {
        type: Number,
        min: 0,
      },

      returnedAt: {
        type: Date,
      },

      returnedTo: {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    },
    {
      timestamps: {
        createdAt: true,
        updatedAt: false,
      },
    }
  );

/*
|--------------------------------------------------------------------------
| Technician open-checkout lookup
|--------------------------------------------------------------------------
*/
chemicalCheckoutSchema.index({
  companyId: 1,
  technicianId: 1,
  returnedAt: 1,
});

/*
|--------------------------------------------------------------------------
| Chemical history
|--------------------------------------------------------------------------
*/
chemicalCheckoutSchema.index({
  companyId: 1,
  chemicalId: 1,
  issuedAt: -1,
});

/*
|--------------------------------------------------------------------------
| Office open-checkout board
|--------------------------------------------------------------------------
*/
chemicalCheckoutSchema.index({
  companyId: 1,
  returnedAt: 1,
  issuedAt: -1,
});

/*
|--------------------------------------------------------------------------
| Export
|--------------------------------------------------------------------------
*/
export const ChemicalCheckout =
  model<IChemicalCheckout>(
    "ChemicalCheckout",
    chemicalCheckoutSchema
  );