import mongoose from "mongoose";
import { Chemical, IChemical } from "../models/Chemical";
import { ChemicalCheckout, IChemicalCheckout } from "../models/ChemicalCheckout";
import { ProjectChemicalUsage, IProjectChemicalUsage } from "../models/ProjectChemicalUsage";
import { User, UserRole } from "../models/User";
import { ApiError } from "../utils/ApiError";
import { CallerScope } from "../utils/callerScope";
import { projectService } from "./project.service";
import {
  CreateChemicalInput,
  RestockChemicalInput,
  CheckoutChemicalInput,
  ReturnChemicalInput,
  LogUsageInput,
} from "../validators/chemical.validators";

export const chemicalService = {
  async listChemicals(activeOnly = true): Promise<IChemical[]> {
    const filter = activeOnly ? { isActive: true } : {};
    return Chemical.find(filter).sort({ name: 1 });
  },

  async createChemical(input: CreateChemicalInput): Promise<IChemical> {
    const existing = await Chemical.findOne({ name: input.name });
    if (existing) {
      throw ApiError.conflict("A chemical with this name already exists");
    }
    return Chemical.create(input);
  },

  /** Adds stock (e.g. a fresh purchase arrives at the office). Atomic — no read-then-write. */
  async restock(chemicalId: string, input: RestockChemicalInput): Promise<IChemical> {
    const updated = await Chemical.findByIdAndUpdate(
      chemicalId,
      { $inc: { currentStock: input.quantity } },
      { new: true }
    );
    if (!updated) throw ApiError.notFound("Chemical not found");
    return updated;
  },

  /**
   * Issues a quantity of a chemical to a technician for the day.
   * Atomic conditional decrement (findOneAndUpdate with a
   * stock >= quantity guard) — the same lesson Module 2's final
   * review applied to project assignment: a plain read-then-write
   * here would let two concurrent checkouts both pass a "is there
   * enough stock" check and take the office into negative stock.
   */
  async checkout(input: CheckoutChemicalInput, scope: CallerScope): Promise<IChemicalCheckout> {
    if (!mongoose.Types.ObjectId.isValid(input.technicianId)) {
      throw ApiError.badRequest("technicianId is not a valid id");
    }
    const technician = await User.findOne({ _id: input.technicianId, role: UserRole.TECHNICIAN });
    if (!technician || !technician.isActive) {
      throw ApiError.badRequest("Technician not found or inactive");
    }

    const chemical = await Chemical.findOneAndUpdate(
      { _id: input.chemicalId, currentStock: { $gte: input.quantityIssued } },
      { $inc: { currentStock: -input.quantityIssued } },
      { new: true }
    );
    if (!chemical) {
      // Either the chemical doesn't exist, or there isn't enough
      // stock — distinguish the two only for a clearer message.
      const exists = await Chemical.exists({ _id: input.chemicalId });
      if (!exists) throw ApiError.notFound("Chemical not found");
      throw ApiError.conflict("Not enough stock available for this quantity");
    }

    return ChemicalCheckout.create({
      technicianId: input.technicianId,
      chemicalId: input.chemicalId,
      quantityIssued: input.quantityIssued,
      issuedBy: scope.userId,
      issuedAt: new Date(),
    });
  },

  /**
   * Records unused chemical returned to the office and credits it
   * back to stock — atomic on both the checkout record (only an
   * open, not-yet-returned checkout can be returned) and the stock
   * increment.
   */
  async returnCheckout(
    checkoutId: string,
    input: ReturnChemicalInput,
    scope: CallerScope
  ): Promise<IChemicalCheckout> {
    const checkout = await ChemicalCheckout.findOneAndUpdate(
      { _id: checkoutId, returnedAt: { $exists: false } },
      {
        $set: {
          returnQuantity: input.returnQuantity,
          returnedAt: new Date(),
          returnedTo: scope.userId,
        },
      },
      { new: true }
    );
    if (!checkout) {
      const exists = await ChemicalCheckout.exists({ _id: checkoutId });
      if (!exists) throw ApiError.notFound("Checkout record not found");
      throw ApiError.conflict("This checkout has already been returned");
    }

    if (input.returnQuantity > 0) {
      await Chemical.findByIdAndUpdate(checkout.chemicalId, {
        $inc: { currentStock: input.returnQuantity },
      });
    }

    return checkout;
  },

  /** Open (not yet returned) checkouts — "what does this technician currently have" or, unfiltered, the office's full open-checkout board. */
  async listOpenCheckouts(technicianId?: string): Promise<IChemicalCheckout[]> {
    const filter: Record<string, unknown> = { returnedAt: { $exists: false } };
    if (technicianId) filter.technicianId = technicianId;
    return ChemicalCheckout.find(filter).sort({ issuedAt: -1 });
  },

  /**
   * Logs chemical consumed on a specific job. Reuses
   * projectService.getProjectById for the visibility check — the
   * exact same function every other project-scoped write in the
   * codebase goes through, so a technician cannot log usage
   * against a project that isn't theirs any more than they could
   * read or update one.
   */
  async logUsage(input: LogUsageInput, scope: CallerScope): Promise<IProjectChemicalUsage> {
    await projectService.getProjectById(input.projectId, scope);

    const chemical = await Chemical.findById(input.chemicalId);
    if (!chemical) throw ApiError.notFound("Chemical not found");

    return ProjectChemicalUsage.create({
      projectId: input.projectId,
      chemicalId: input.chemicalId,
      quantityUsed: input.quantityUsed,
      loggedBy: scope.userId,
    });
  },

  /** Same visibility check applied before returning a project's usage log. */
  async getProjectUsage(projectId: string, scope: CallerScope): Promise<IProjectChemicalUsage[]> {
    await projectService.getProjectById(projectId, scope);
    return ProjectChemicalUsage.find({ projectId }).sort({ loggedAt: 1 });
  },
};
