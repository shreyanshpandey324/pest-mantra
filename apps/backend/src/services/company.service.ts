import mongoose from "mongoose";

import {
  Company,
  CompanyStatus,
  ICompany,
} from "../models/Company";

import {
  Branch,
  IBranch,
} from "../models/Branch";

import {
  UserRole,
} from "../models/User";

import {
  ApiError,
} from "../utils/ApiError";

import {
  CallerScope,
} from "../utils/callerScope";

import {
  CreateCompanyInput,
  UpdateCompanyInput,
  CreateBranchInput,
  UpdateBranchInput,
} from "../validators/company.validators";

function toObjectId(
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

function requireCompanyScope(
  scope: CallerScope
): mongoose.Types.ObjectId {
  if (!scope.companyId) {
    throw ApiError.forbidden(
      "Your account is not linked to a company"
    );
  }

  return toObjectId(
    scope.companyId,
    "Your company id is invalid"
  );
}

function assertSuperAdmin(
  scope: CallerScope
): void {
  if (
    scope.role !==
    UserRole.SUPER_ADMIN
  ) {
    throw ApiError.forbidden(
      "Only a super admin can perform this action"
    );
  }
}

export const companyService = {
  /*
   * ------------------------------------------------------------
   * COMPANY
   * ------------------------------------------------------------
   */

  async listCompanies(
    scope: CallerScope
  ): Promise<ICompany[]> {
    assertSuperAdmin(scope);

    return Company.find()
      .sort({
        createdAt: -1,
      });
  },

  async getCompanyById(
    companyId: string,
    scope: CallerScope
  ): Promise<ICompany> {
    const id =
      toObjectId(
        companyId,
        "Invalid company id"
      );

    /*
     * Super Admin can inspect any company.
     */
    if (
      scope.role ===
      UserRole.SUPER_ADMIN
    ) {
      const company =
        await Company.findById(id);

      if (!company) {
        throw ApiError.notFound(
          "Company not found"
        );
      }

      return company;
    }

    /*
     * Company users can only inspect
     * their own company.
     */
    const ownCompanyId =
      requireCompanyScope(scope);

    if (
      ownCompanyId.toString() !==
      id.toString()
    ) {
      throw ApiError.notFound(
        "Company not found"
      );
    }

    const company =
      await Company.findById(id);

    if (!company) {
      throw ApiError.notFound(
        "Company not found"
      );
    }

    return company;
  },

  async createCompany(
    input: CreateCompanyInput,
    scope: CallerScope
  ): Promise<ICompany> {
    assertSuperAdmin(scope);

    const existing =
      await Company.findOne({
        name: input.name,
      });

    if (existing) {
      throw ApiError.conflict(
        "A company with this name already exists"
      );
    }

    return Company.create({
      name: input.name,
      phone: input.phone,
      email: input.email,
      status:
        CompanyStatus.PENDING,
      isActive: false,
    });
  },

  async updateCompany(
    companyId: string,
    input: UpdateCompanyInput,
    scope: CallerScope
  ): Promise<ICompany> {
    assertSuperAdmin(scope);

    const id =
      toObjectId(
        companyId,
        "Invalid company id"
      );

    const company =
      await Company.findById(id);

    if (!company) {
      throw ApiError.notFound(
        "Company not found"
      );
    }

    if (
      input.name &&
      input.name !== company.name
    ) {
      const duplicate =
        await Company.findOne({
          name: input.name,
          _id: {
            $ne: id,
          },
        });

      if (duplicate) {
        throw ApiError.conflict(
          "A company with this name already exists"
        );
      }

      company.name =
        input.name;
    }

    if (
      input.phone !== undefined
    ) {
      company.phone =
        input.phone;
    }

    if (
      input.email !== undefined
    ) {
      company.email =
        input.email;
    }

    if (
      input.status !== undefined
    ) {
      company.status =
        input.status;

      if (
        input.status ===
        CompanyStatus.APPROVED
      ) {
        company.isActive = true;
        company.approvedAt =
          new Date();

        company.approvedBy =
          new mongoose.Types.ObjectId(
            scope.userId
          );
      }

      if (
        input.status ===
        CompanyStatus.SUSPENDED ||
        input.status ===
        CompanyStatus.REJECTED
      ) {
        company.isActive =
          false;
      }
    }

    if (
      input.isActive !== undefined
    ) {
      company.isActive =
        input.isActive;
    }

    await company.save();

    return company;
  },

  async approveCompany(
    companyId: string,
    scope: CallerScope
  ): Promise<ICompany> {
    assertSuperAdmin(scope);

    const id =
      toObjectId(
        companyId,
        "Invalid company id"
      );

    const company =
      await Company.findById(id);

    if (!company) {
      throw ApiError.notFound(
        "Company not found"
      );
    }

    company.status =
      CompanyStatus.APPROVED;

    company.isActive = true;

    company.approvedAt =
      new Date();

    company.approvedBy =
      new mongoose.Types.ObjectId(
        scope.userId
      );

    await company.save();

    return company;
  },

  async suspendCompany(
    companyId: string,
    scope: CallerScope
  ): Promise<ICompany> {
    assertSuperAdmin(scope);

    const id =
      toObjectId(
        companyId,
        "Invalid company id"
      );

    const company =
      await Company.findById(id);

    if (!company) {
      throw ApiError.notFound(
        "Company not found"
      );
    }

    company.status =
      CompanyStatus.SUSPENDED;

    company.isActive = false;

    await company.save();

    return company;
  },

  /*
   * ------------------------------------------------------------
   * BRANCH
   * ------------------------------------------------------------
   */

  async listBranches(
    scope: CallerScope,
    companyId?: string
  ): Promise<IBranch[]> {
    let filter: Record<
      string,
      unknown
    > = {};

    if (
      scope.role ===
      UserRole.SUPER_ADMIN
    ) {
      if (companyId) {
        filter.companyId =
          toObjectId(
            companyId,
            "Invalid company id"
          );
      }
    } else {
      filter.companyId =
        requireCompanyScope(scope);
    }

    return Branch.find(
      filter
    ).sort({
      name: 1,
    });
  },

  async getBranchById(
    branchId: string,
    scope: CallerScope
  ): Promise<IBranch> {
    const id =
      toObjectId(
        branchId,
        "Invalid branch id"
      );

    const filter: Record<
      string,
      unknown
    > = {
      _id: id,
    };

    if (
      scope.role !==
      UserRole.SUPER_ADMIN
    ) {
      filter.companyId =
        requireCompanyScope(scope);
    }

    const branch =
      await Branch.findOne(
        filter
      );

    if (!branch) {
      throw ApiError.notFound(
        "Branch not found"
      );
    }

    return branch;
  },

  async createBranch(
    input: CreateBranchInput,
    scope: CallerScope
  ): Promise<IBranch> {
    const companyId =
      toObjectId(
        input.companyId,
        "Invalid company id"
      );

    /*
     * Office Admin cannot create a branch
     * for another company.
     */
    if (
      scope.role !==
      UserRole.SUPER_ADMIN
    ) {
      const ownCompanyId =
        requireCompanyScope(scope);

      if (
        ownCompanyId.toString() !==
        companyId.toString()
      ) {
        throw ApiError.forbidden(
          "You cannot create a branch for another company"
        );
      }
    }

    const company =
      await Company.findById(
        companyId
      );

    if (!company) {
      throw ApiError.badRequest(
        "Company not found"
      );
    }

    if (!company.isActive) {
      throw ApiError.badRequest(
        "Cannot create a branch for an inactive company"
      );
    }

    const existing =
      await Branch.findOne({
        companyId,
        name: input.name,
      });

    if (existing) {
      throw ApiError.conflict(
        "A branch with this name already exists in this company"
      );
    }

    return Branch.create({
      companyId,
      name: input.name,
      city: input.city,
      state: input.state,
      isActive:
        input.isActive ?? true,
    });
  },

  async updateBranch(
    branchId: string,
    input: UpdateBranchInput,
    scope: CallerScope
  ): Promise<IBranch> {
    const id =
      toObjectId(
        branchId,
        "Invalid branch id"
      );

    const filter: Record<
      string,
      unknown
    > = {
      _id: id,
    };

    if (
      scope.role !==
      UserRole.SUPER_ADMIN
    ) {
      filter.companyId =
        requireCompanyScope(scope);
    }

    const branch =
      await Branch.findOne(
        filter
      );

    if (!branch) {
      throw ApiError.notFound(
        "Branch not found"
      );
    }

    if (
      input.name &&
      input.name !== branch.name
    ) {
      const duplicate =
        await Branch.findOne({
          companyId:
            branch.companyId,
          name: input.name,
          _id: {
            $ne: branch._id,
          },
        });

      if (duplicate) {
        throw ApiError.conflict(
          "A branch with this name already exists in this company"
        );
      }

      branch.name =
        input.name;
    }

    if (
      input.city !== undefined
    ) {
      branch.city =
        input.city;
    }

    if (
      input.state !== undefined
    ) {
      branch.state =
        input.state;
    }

    if (
      input.isActive !== undefined
    ) {
      branch.isActive =
        input.isActive;
    }

    await branch.save();

    return branch;
  },
};