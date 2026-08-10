import {
  Schema,
  model,
  Document,
  Types,
} from "mongoose";

export enum ChemicalUnit {
  LITRE = "litre",
  KG = "kg",
  PIECE = "piece",
  ML = "ml",
  GRAM = "gram",
}

export interface IChemical
  extends Document {
  _id: Types.ObjectId;

  companyId?: Types.ObjectId;

  name: string;

  unit: ChemicalUnit;

  currentStock: number;

  lowStockThreshold: number;

  isActive: boolean;

  createdAt: Date;

  updatedAt: Date;
}

const chemicalSchema =
  new Schema<IChemical>(
    {
      /*
       * Tenant/company ownership.
       *
       * Kept optional for compatibility
       * with existing Super Admin/global
       * inventory records.
       */
      companyId: {
        type: Schema.Types.ObjectId,
        ref: "Company",
        index: true,
      },

      name: {
        type: String,
        required: [
          true,
          "Chemical name is required",
        ],
        trim: true,
        minlength: 2,
        maxlength: 100,
      },

      unit: {
        type: String,
        enum: Object.values(
          ChemicalUnit
        ),
        required: true,
      },

      currentStock: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
      },

      lowStockThreshold: {
        type: Number,
        required: true,
        default: 5,
        min: 0,
      },

      isActive: {
        type: Boolean,
        default: true,
        index: true,
      },
    },
    {
      timestamps: true,
    }
  );

/*
|--------------------------------------------------------------------------
| Inventory listing
|--------------------------------------------------------------------------
*/
chemicalSchema.index({
  companyId: 1,
  isActive: 1,
  name: 1,
});

/*
|--------------------------------------------------------------------------
| Company + chemical lookup
|--------------------------------------------------------------------------
|
| Used when checking whether a chemical
| already exists for the same company.
|
*/
chemicalSchema.index({
  companyId: 1,
  name: 1,
});

/*
|--------------------------------------------------------------------------
| Stock management
|--------------------------------------------------------------------------
*/
chemicalSchema.index({
  companyId: 1,
  currentStock: 1,
});

/*
|--------------------------------------------------------------------------
| Export
|--------------------------------------------------------------------------
*/
export const Chemical =
  model<IChemical>(
    "Chemical",
    chemicalSchema
  );