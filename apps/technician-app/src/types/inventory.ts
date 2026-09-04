export type ChemicalUnit = "litre" | "kg" | "piece" | "ml" | "gram";

export const CHEMICAL_UNIT_LABELS: Record<ChemicalUnit, string> = {
  litre: "L",
  kg: "kg",
  piece: "pc",
  ml: "ml",
  gram: "g",
};

export interface Chemical {
  _id: string;
  name: string;
  unit: ChemicalUnit;
  currentStock: number;
  lowStockThreshold: number;
  isActive: boolean;
}

export interface ProjectChemicalUsage {
  _id: string;
  projectId: string;
  chemicalId: string;
  quantityUsed: number;
  loggedBy: string;
  loggedAt: string;
}
