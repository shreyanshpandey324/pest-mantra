import mongoose from "mongoose";

import {
  Chemical,
  IChemical,
} from "../models/Chemical";

import {
  ChemicalCheckout,
  IChemicalCheckout,
} from "../models/ChemicalCheckout";

import {
  ProjectChemicalUsage,
  IProjectChemicalUsage,
} from "../models/ProjectChemicalUsage";

import {
  User,
  UserRole,
} from "../models/User";

import {
  ApiError,
} from "../utils/ApiError";

import {
  CallerScope,
} from "../utils/callerScope";

import {
  projectService,
} from "./project.service";

import {
  CreateChemicalInput,
  RestockChemicalInput,
  CheckoutChemicalInput,
  ReturnChemicalInput,
  LogUsageInput,
} from "../validators/chemical.validators";

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function objectId(
  value: string,
  message: string
): mongoose.Types.ObjectId {
  if (
    !mongoose.Types.ObjectId.isValid(
      value
    )
  ) {
    throw ApiError.badRequest(
      message
    );
  }

  return new mongoose.Types.ObjectId(
    value
  );
}

function companyFilter(
  scope: CallerScope
): Record<string, unknown> {
  /*
   * Super Admin may operate without a
   * company-specific scope.
   */
  if (!scope.companyId) {
    return {};
  }

  return {
    companyId: objectId(
      scope.companyId,
      "Invalid company id"
    ),
  };
}

/*
|--------------------------------------------------------------------------
| Service
|--------------------------------------------------------------------------
*/

export const chemicalService = {
  /*
  |--------------------------------------------------------------------------
  | LIST CHEMICALS
  |--------------------------------------------------------------------------
  */

  async listChemicals(
    scope: CallerScope,
    activeOnly = true
  ): Promise<IChemical[]> {
    const filter: Record<
      string,
      unknown
    > = {
      ...companyFilter(scope),
    };

    if (activeOnly) {
      filter.isActive = true;
    }

    return Chemical.find(
      filter
    ).sort({
      name: 1,
    });
  },

  /*
  |--------------------------------------------------------------------------
  | CREATE CHEMICAL
  |--------------------------------------------------------------------------
  */

  async createChemical(
    input: CreateChemicalInput,
    scope: CallerScope
  ): Promise<IChemical> {
    const filter: Record<
      string,
      unknown
    > = {
      name: input.name,
      ...companyFilter(scope),
    };

    const existing =
      await Chemical.findOne(
        filter
      );

    if (existing) {
      throw ApiError.conflict(
        "A chemical with this name already exists"
      );
    }

    return Chemical.create({
      ...input,

      companyId:
        scope.companyId
          ? objectId(
              scope.companyId,
              "Invalid company id"
            )
          : undefined,
    });
  },

  /*
  |--------------------------------------------------------------------------
  | RESTOCK
  |--------------------------------------------------------------------------
  |
  | Atomic increment.
  |
  */

  async restock(
    chemicalId: string,
    input: RestockChemicalInput,
    scope: CallerScope
  ): Promise<IChemical> {
    const updated =
      await Chemical.findOneAndUpdate(
        {
          _id: objectId(
            chemicalId,
            "Invalid chemical id"
          ),

          ...companyFilter(
            scope
          ),
        },
        {
          $inc: {
            currentStock:
              input.quantity,
          },
        },
        {
          new: true,
        }
      );

    if (!updated) {
      throw ApiError.notFound(
        "Chemical not found"
      );
    }

    return updated;
  },

  /*
  |--------------------------------------------------------------------------
  | CHECKOUT CHEMICAL
  |--------------------------------------------------------------------------
  |
  | Issues chemical stock to a technician.
  |
  | The stock decrement is atomic:
  |
  | currentStock >= quantityIssued
  |
  */

  async checkout(
    input: CheckoutChemicalInput,
    scope: CallerScope
  ): Promise<IChemicalCheckout> {
    const technicianId =
      objectId(
        input.technicianId,
        "technicianId is not a valid id"
      );

    const chemicalId =
      objectId(
        input.chemicalId,
        "chemicalId is not a valid id"
      );

    const technician =
      await User.findOne({
        _id: technicianId,

        role:
          UserRole.TECHNICIAN,

        isActive: true,

        ...companyFilter(
          scope
        ),
      });

    if (!technician) {
      throw ApiError.badRequest(
        "Technician not found or inactive"
      );
    }

    /*
     * Atomic conditional decrement.
     */
    const chemical =
      await Chemical.findOneAndUpdate(
        {
          _id: chemicalId,

          currentStock: {
            $gte:
              input.quantityIssued,
          },

          ...companyFilter(
            scope
          ),
        },
        {
          $inc: {
            currentStock:
              -input.quantityIssued,
          },
        },
        {
          new: true,
        }
      );

    if (!chemical) {
      /*
       * Distinguish "not found" from
       * "insufficient stock".
       */
      const exists =
        await Chemical.exists({
          _id: chemicalId,

          ...companyFilter(
            scope
          ),
        });

      if (!exists) {
        throw ApiError.notFound(
          "Chemical not found"
        );
      }

      throw ApiError.conflict(
        "Not enough stock available for this quantity"
      );
    }

    return ChemicalCheckout.create({
      companyId:
        chemical.companyId,

      technicianId,

      chemicalId,

      quantityIssued:
        input.quantityIssued,

      issuedBy: objectId(
        scope.userId,
        "Invalid user id"
      ),

      issuedAt:
        new Date(),
    });
  },

  /*
  |--------------------------------------------------------------------------
  | RETURN CHEMICAL
  |--------------------------------------------------------------------------
  |
  | Rules:
  |
  | 1. Checkout must exist.
  | 2. Checkout must belong to caller's company.
  | 3. Checkout must not already be returned.
  | 4. Return quantity cannot be negative.
  | 5. Return quantity cannot exceed issued quantity.
  | 6. Returned quantity is credited back to stock.
  |
  */

  async returnCheckout(
    checkoutId: string,
    input: ReturnChemicalInput,
    scope: CallerScope
  ): Promise<IChemicalCheckout> {
    const checkoutObjectId =
      objectId(
        checkoutId,
        "Invalid checkout id"
      );

    /*
     * First fetch the open checkout.
     *
     * This lets us validate the maximum
     * return quantity before modifying it.
     */
    const existingCheckout =
      await ChemicalCheckout.findOne({
        _id:
          checkoutObjectId,

        returnedAt: {
          $exists: false,
        },

        ...companyFilter(
          scope
        ),
      });

    if (!existingCheckout) {
      const exists =
        await ChemicalCheckout.exists({
          _id:
            checkoutObjectId,

          ...companyFilter(
            scope
          ),
        });

      if (!exists) {
        throw ApiError.notFound(
          "Checkout record not found"
        );
      }

      throw ApiError.conflict(
        "This checkout has already been returned"
      );
    }

    /*
     * Never allow more chemical to be
     * returned than was issued.
     */
    if (
      input.returnQuantity >
      existingCheckout.quantityIssued
    ) {
      throw ApiError.badRequest(
        `Return quantity cannot exceed issued quantity (${existingCheckout.quantityIssued})`
      );
    }

    /*
     * Atomically close the checkout.
     *
     * The returnedAt condition prevents
     * two simultaneous requests from
     * returning the same checkout twice.
     */
    const checkout =
      await ChemicalCheckout.findOneAndUpdate(
        {
          _id:
            checkoutObjectId,

          returnedAt: {
            $exists: false,
          },

          ...companyFilter(
            scope
          ),
        },
        {
          $set: {
            returnQuantity:
              input.returnQuantity,

            returnedAt:
              new Date(),

            returnedTo:
              objectId(
                scope.userId,
                "Invalid user id"
              ),
          },
        },
        {
          new: true,
        }
      );

    if (!checkout) {
      throw ApiError.conflict(
        "This checkout has already been returned"
      );
    }

    /*
     * Credit returned chemical
     * back into company stock.
     */
    if (
      input.returnQuantity > 0
    ) {
      const chemical =
        await Chemical.findOneAndUpdate(
          {
            _id:
              checkout.chemicalId,

            ...companyFilter(
              scope
            ),
          },
          {
            $inc: {
              currentStock:
                input.returnQuantity,
            },
          },
          {
            new: true,
          }
        );

      /*
       * Normally impossible because the
       * checkout references a chemical,
       * but don't silently succeed if the
       * chemical has disappeared.
       */
      if (!chemical) {
        throw ApiError.notFound(
          "Chemical associated with this checkout was not found"
        );
      }
    }

    return checkout;
  },

  /*
  |--------------------------------------------------------------------------
  | LIST OPEN CHECKOUTS
  |--------------------------------------------------------------------------
  |
  | Technician:
  |   only their own records.
  |
  | Admin:
  |   company records, optionally filtered
  |   by technician.
  |
  */

  async listOpenCheckouts(
    scope: CallerScope,
    technicianId?: string
  ): Promise<IChemicalCheckout[]> {
    const filter: Record<
      string,
      unknown
    > = {
      returnedAt: {
        $exists: false,
      },

      ...companyFilter(
        scope
      ),
    };

    /*
     * If technicianId was supplied,
     * validate that the technician belongs
     * to the caller's company.
     */
    if (technicianId) {
      const technicianObjectId =
        objectId(
          technicianId,
          "Invalid technician id"
        );

      const technician =
        await User.findOne({
          _id:
            technicianObjectId,

          role:
            UserRole.TECHNICIAN,

          ...companyFilter(
            scope
          ),
        });

      if (!technician) {
        throw ApiError.notFound(
          "Technician not found"
        );
      }

      filter.technicianId =
        technicianObjectId;
    }

    return ChemicalCheckout.find(
      filter
    ).sort({
      issuedAt: -1,
    });
  },

  /*
  |--------------------------------------------------------------------------
  | LOG CHEMICAL USAGE
  |--------------------------------------------------------------------------
  |
  | A usage record can only be created
  | for a project the caller can access
  | and a chemical belonging to the same
  | company.
  |
  */

  async logUsage(
    input: LogUsageInput,
    scope: CallerScope
  ): Promise<IProjectChemicalUsage> {
    /*
     * Project visibility/company
     * authorization.
     */
    const project =
      await projectService.getProjectById(
        input.projectId,
        scope
      );

    const projectId =
      objectId(
        input.projectId,
        "Invalid project id"
      );

    const chemicalId =
      objectId(
        input.chemicalId,
        "Invalid chemical id"
      );

    const chemical =
      await Chemical.findOne({
        _id: chemicalId,

        ...companyFilter(
          scope
        ),
      });

    if (!chemical) {
      throw ApiError.notFound(
        "Chemical not found"
      );
    }

    /*
     * Extra consistency check:
     *
     * A project and chemical must belong
     * to the same company whenever both
     * are tenant-scoped.
     */
    if (
      project.companyId &&
      chemical.companyId &&
      project.companyId.toString() !==
        chemical.companyId.toString()
    ) {
      throw ApiError.forbidden(
        "Chemical does not belong to the project's company"
      );
    }

    return ProjectChemicalUsage.create({
      companyId:
        chemical.companyId ??
        project.companyId,

      projectId,

      chemicalId,

      quantityUsed:
        input.quantityUsed,

      loggedBy: objectId(
        scope.userId,
        "Invalid user id"
      ),
    });
  },

  /*
  |--------------------------------------------------------------------------
  | PROJECT CHEMICAL USAGE
  |--------------------------------------------------------------------------
  */

  async getProjectUsage(
    projectId: string,
    scope: CallerScope
  ): Promise<IProjectChemicalUsage[]> {
    await projectService.getProjectById(
      projectId,
      scope
    );

    return ProjectChemicalUsage.find({
      projectId: objectId(
        projectId,
        "Invalid project id"
      ),

      ...companyFilter(
        scope
      ),
    }).sort({
      loggedAt: 1,
    });
  },
};