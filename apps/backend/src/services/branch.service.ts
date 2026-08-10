import mongoose from "mongoose";
import {
  Branch,
  IBranch,
} from "../models/Branch";
import {
  Company,
  CompanyStatus,
} from "../models/Company";
import { ApiError } from "../utils/ApiError";
import {
  CallerScope,
} from "../utils/callerScope";
import {
  CreateBranchInput,
  UpdateBranchInput,
} from "../validators/branch.validators";

function validObjectId(
  value: string,
  message: string
): mongoose.Types.ObjectId {
  if (
    !mongoose.Types.ObjectId.isValid(value)
  ) {
    throw ApiError.badRequest(message);
  }

  return new mongoose.Types.ObjectId(value);
}

async function ensureCompanyAvailable(
  companyId: string
): Promise<void> {
  const company =
    await Company.findById(companyId);

  if (!company) {
    throw ApiError.notFound(
      "Company not found"
    );
  }

  if (
    company.status !==
      CompanyStatus.APPROVED ||
    !company.isActive
  ) {
    throw ApiError.badRequest(
      "Company is not approved or active"
    );
  }
}

export const branchService = {
  async createBranch(
    input: CreateBranchInput,
    scope: CallerScope
  ): Promise<IBranch> {
    /*
     * Super Admin creates a branch for a
     * selected company.
     *
     * Office Admin can only create a branch
     * inside their own company.
     */
    let companyId: string | undefined;

    if (scope.role === "super_admin") {
      if (!input.companyId) {
        throw ApiError.badRequest(
          "companyId is required for super admin"
        );
      }

      companyId = input.companyId;
    } else {
      if (!scope.companyId) {
        throw ApiError.forbidden(
          "Your account is not linked to a company"
        );
      }

      companyId = scope.companyId;
    }

    const companyObjectId =
      validObjectId(
        companyId,
        "Invalid company id"
      );

    await ensureCompanyAvailable(
      companyId
    );

    const existing =
      await Branch.findOne({
        companyId: companyObjectId,
        name: input.name,
      });

    if (existing) {
      throw ApiError.conflict(
        "A branch with this name already exists in this company"
      );
    }

    return Branch.create({
      companyId: companyObjectId,
      name: input.name,
      city: input.city,
      state: input.state,
      isActive: true,
    });
  },

  async listBranches(
    scope: CallerScope,
    companyIdInput?: string
  ): Promise<IBranch[]> {
    let companyId: string | undefined;

    if (scope.role === "super_admin") {
      if (!companyIdInput) {
        return Branch.find()
          .sort({
            createdAt: -1,
          });
      }

      companyId = companyIdInput;
    } else {
      if (!scope.companyId) {
        throw ApiError.forbidden(
          "Your account is not linked to a company"
        );
      }

      companyId = scope.companyId;
    }

    const companyObjectId =
      validObjectId(
        companyId,
        "Invalid company id"
      );

    return Branch.find({
      companyId: companyObjectId,
    }).sort({
      createdAt: -1,
    });
  },

  async getBranchById(
    branchId: string,
    scope: CallerScope
  ): Promise<IBranch> {
    const branchObjectId =
      validObjectId(
        branchId,
        "Invalid branch id"
      );

    const filter: Record<
      string,
      unknown
    > = {
      _id: branchObjectId,
    };

    /*
     * Never allow a normal tenant user
     * to access another company's branch.
     */
    if (scope.role !== "super_admin") {
      if (!scope.companyId) {
        throw ApiError.forbidden(
          "Your account is not linked to a company"
        );
      }

      filter.companyId =
        validObjectId(
          scope.companyId,
          "Invalid company id"
        );
    }

    const branch =
      await Branch.findOne(filter);

    if (!branch) {
      throw ApiError.notFound(
        "Branch not found"
      );
    }

    return branch;
  },

  async updateBranch(
    branchId: string,
    input: UpdateBranchInput,
    scope: CallerScope
  ): Promise<IBranch> {
    const branch =
      await this.getBranchById(
        branchId,
        scope
      );

    const duplicateFilter: Record<
      string,
      unknown
    > = {
      _id: {
        $ne: branch._id,
      },
      companyId: branch.companyId,
      name: input.name,
    };

    const duplicate =
      await Branch.findOne(
        duplicateFilter
      );

    if (duplicate) {
      throw ApiError.conflict(
        "A branch with this name already exists in this company"
      );
    }

    branch.name = input.name;
    branch.city = input.city;
    branch.state = input.state;

    if (
      input.isActive !== undefined
    ) {
      branch.isActive =
        input.isActive;
    }

    await branch.save();

    return branch;
  },

  async deleteBranch(
    branchId: string,
    scope: CallerScope
  ): Promise<void> {
    const branch =
      await this.getBranchById(
        branchId,
        scope
      );

    await Branch.deleteOne({
      _id: branch._id,
    });
  },
};