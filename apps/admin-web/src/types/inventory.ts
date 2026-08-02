export enum ChemicalUnit {
  LITRE = "litre",
  KG = "kg",
  PIECE = "piece",
  ML = "ml",
  GRAM = "gram",
}

export const UNIT_LABELS: Record<ChemicalUnit, string> = {
  [ChemicalUnit.LITRE]: "Litre",
  [ChemicalUnit.KG]: "Kg",
  [ChemicalUnit.PIECE]: "Piece",
  [ChemicalUnit.ML]: "ml",
  [ChemicalUnit.GRAM]: "g",
};

export interface Chemical {
  _id: string;
  name: string;
  unit: ChemicalUnit;
  currentStock: number;
  lowStockThreshold: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChemicalCheckout {
  _id: string;
  technicianId: string;
  chemicalId: string;
  quantityIssued: number;
  issuedBy: string;
  issuedAt: string;
  returnQuantity?: number;
  returnedAt?: string;
  returnedTo?: string;
}
