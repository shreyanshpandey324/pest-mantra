import mongoose from "mongoose";

import {
  User,
  IUser,
  UserRole,
} from "../models/User";

import {
  TechnicianProfile,
} from "../models/TechnicianProfile";

import {
  Branch,
} from "../models/Branch";

import {
  ApiError,
} from "../utils/ApiError";

import {
  CreateUserInput,
  UpdateUserInput,
} from "../validators/auth.validators";

import {
  CallerScope,
} from "../utils/callerScope";

/**
 * Resolve a branch and make sure it belongs
 * to the expected company.
 */
async function getValidatedBranch(
  branchId: string,
  expectedCompanyId?: string
) {
  if (
    !mongoose.Types.ObjectId.isValid(
      branchId
    )
  ) {
    throw ApiError.badRequest(
      "branchId is not a valid id"
    );
  }

  const branch =
    await Branch.findById(
      branchId
    );

  if (!branch) {
    throw ApiError.badRequest(
      "branchId does not refer to an existing branch"
    );
  }

  if (!branch.companyId) {
    throw ApiError.badRequest(
      "This branch is not linked to a company"
    );
  }

  if (
    expectedCompanyId &&
    branch.companyId.toString() !==
      expectedCompanyId
  ) {
    throw ApiError.forbidden(
      "You cannot use a branch belonging to another company"
    );
  }

  if (!branch.isActive) {
    throw ApiError.badRequest(
      "This branch is inactive"
    );
  }

  return branch;
}

/**
 * Determine the company from a branch.
 */
async function resolveCompanyFromBranch(
  branchId: string,
  expectedCompanyId?: string
): Promise<mongoose.Types.ObjectId> {
  const branch =
    await getValidatedBranch(
      branchId,
      expectedCompanyId
    );

  if (!branch.companyId) {
    throw ApiError.badRequest(
      "Branch is not linked to a company"
    );
  }

  return branch.companyId;
}

/**
 * Check whether a target user belongs
 * to the caller's company.
 */
function assertSameCompany(
  targetUser: IUser,
  scope: CallerScope
): void {
  if (
    scope.role ===
    UserRole.SUPER_ADMIN
  ) {
    return;
  }

  if (
    !scope.companyId ||
    !targetUser.companyId ||
    targetUser.companyId.toString() !==
      scope.companyId
  ) {
    throw ApiError.forbidden(
      "You cannot access a user belonging to another company"
    );
  }
}

/**
 * Check whether the target role can be
 * managed by the caller.
 */
function assertCanManageRole(
  targetRole: UserRole,
  scope: CallerScope
): void {
  if (
    scope.role ===
    UserRole.SUPER_ADMIN
  ) {
    if (
      targetRole ===
      UserRole.SUPER_ADMIN
    ) {
      throw ApiError.forbidden(
        "Super admins cannot be created or managed through this user endpoint"
      );
    }

    return;
  }

  if (
    scope.role ===
    UserRole.OFFICE_ADMIN
  ) {
    if (
      targetRole !==
      UserRole.TECHNICIAN
    ) {
      throw ApiError.forbidden(
        "Office admins can only manage technicians"
      );
    }

    return;
  }

  throw ApiError.forbidden(
    "You do not have permission to manage users"
  );
}

export const userService = {
  /**
   * Create a staff account.
   *
   * Super Admin:
   * - can create Office Admin
   * - can create Technician
   *
   * Office Admin:
   * - can create Technician only
   * - technician must belong to the
   *   Office Admin's own company and branch
   */
  async createUser(
    input: CreateUserInput,
    scope: CallerScope
  ): Promise<IUser> {
    assertCanManageRole(
      input.role,
      scope
    );

    const existing =
      await User.findOne({
        phone: input.phone,
      });

    if (existing) {
      throw ApiError.conflict(
        "A user with this phone number already exists"
      );
    }

    let companyId:
      | mongoose.Types.ObjectId
      | undefined;

    let branchId:
      | mongoose.Types.ObjectId
      | undefined;

    /*
     * Every non-super-admin account
     * must have a branch and company.
     */
    if (
      input.role !==
      UserRole.SUPER_ADMIN
    ) {
      if (!input.branchId) {
        throw ApiError.badRequest(
          "branchId is required for this role"
        );
      }

      /*
       * For Office Admin, the branch must
       * belong to the authenticated company.
       *
       * For Super Admin, any valid active
       * company branch may be selected.
       */
      companyId =
        await resolveCompanyFromBranch(
          input.branchId,
          scope.role ===
            UserRole.SUPER_ADMIN
            ? undefined
            : scope.companyId
        );

      branchId =
        new mongoose.Types.ObjectId(
          input.branchId
        );
    }

    /*
     * Create the user.
     */
    const user =
      await User.create({
        name: input.name,
        phone: input.phone,
        email: input.email,
        passwordHash: input.password,
        role: input.role,
        companyId,
        branchId,
        isActive: true,
      });

    /*
     * Technicians receive a profile.
     *
     * IMPORTANT:
     * Keep companyId + branchId synchronized
     * with the User account.
     */
    if (
      input.role ===
      UserRole.TECHNICIAN
    ) {
      const employeeCode =
        await generateEmployeeCode();

      await TechnicianProfile.create({
        companyId,
        branchId,
        userId: user._id,
        employeeCode,
      });
    }

    return user;
  },

  /**
   * Update a user.
   */
  async updateUser(
    userId: string,
    input: UpdateUserInput,
    scope: CallerScope
  ): Promise<IUser> {
    if (
      !mongoose.Types.ObjectId.isValid(
        userId
      )
    ) {
      throw ApiError.badRequest(
        "Invalid user id"
      );
    }

    const user =
      await User.findById(
        userId
      );

    if (!user) {
      throw ApiError.notFound(
        "User not found"
      );
    }

    /*
     * Super Admin accounts cannot be
     * modified through this endpoint.
     */
    if (
      user.role ===
      UserRole.SUPER_ADMIN
    ) {
      throw ApiError.forbidden(
        "Super admin accounts cannot be modified through this endpoint"
      );
    }

    assertSameCompany(
      user,
      scope
    );

    assertCanManageRole(
      user.role,
      scope
    );

    /*
     * Phone uniqueness.
     */
    if (
      input.phone !==
      user.phone
    ) {
      const existing =
        await User.findOne({
          phone: input.phone,
          _id: {
            $ne: user._id,
          },
        });

      if (existing) {
        throw ApiError.conflict(
          "Phone number already exists"
        );
      }
    }

    /*
     * Basic fields.
     */
    user.name =
      input.name;

    user.phone =
      input.phone;

    user.email =
      input.email;

    /*
     * Track whether the branch changed.
     */
    let newBranchId:
      | mongoose.Types.ObjectId
      | undefined;

    /*
     * Branch changes are validated against
     * the caller's company.
     */
    if (input.branchId) {
      const newCompanyId =
        await resolveCompanyFromBranch(
          input.branchId,
          scope.role ===
            UserRole.SUPER_ADMIN
            ? undefined
            : scope.companyId
        );

      newBranchId =
        new mongoose.Types.ObjectId(
          input.branchId
        );

      /*
       * Existing company must remain
       * consistent with the new branch.
       */
      if (
        user.companyId &&
        user.companyId.toString() !==
          newCompanyId.toString()
      ) {
        /*
         * Only Super Admin can move a user
         * between companies.
         */
        if (
          scope.role !==
          UserRole.SUPER_ADMIN
        ) {
          throw ApiError.forbidden(
            "You cannot move a user to another company"
          );
        }
      }

      user.companyId =
        newCompanyId;

      user.branchId =
        newBranchId;

      /*
       * Keep technician profile tenant
       * information synchronized.
       */
      if (
        user.role ===
        UserRole.TECHNICIAN
      ) {
        await TechnicianProfile.updateOne(
          {
            userId: user._id,
          },
          {
            $set: {
              companyId:
                newCompanyId,
              branchId:
                newBranchId,
            },
          }
        );
      }
    }

    /*
     * Update technician-specific fields.
     */
    if (
      user.role ===
      UserRole.TECHNICIAN
    ) {
      const profileUpdate: Record<
        string,
        unknown
      > = {};

      if (
        input.vehicleNumber !==
        undefined
      ) {
        profileUpdate.vehicleNumber =
          input.vehicleNumber;
      }

      if (
        input.skills !==
        undefined
      ) {
        profileUpdate.skills =
          input.skills;
      }

      if (
        input.dutyStatus !==
        undefined
      ) {
        profileUpdate.currentDutyStatus =
          input.dutyStatus;
      }

      /*
       * Keep branch/company synchronized even
       * when branchId was not explicitly changed.
       */
      if (user.companyId) {
        profileUpdate.companyId =
          user.companyId;
      }

      if (user.branchId) {
        profileUpdate.branchId =
          user.branchId;
      }

      if (
        Object.keys(profileUpdate)
          .length > 0
      ) {
        await TechnicianProfile.updateOne(
          {
            userId: user._id,
          },
          {
            $set: profileUpdate,
          },
          {
            upsert: true,
          }
        );
      }
    }

    /*
     * Active status belongs to User.
     */
    if (
      input.isActive !==
      undefined
    ) {
      user.isActive =
        input.isActive;
    }

    await user.save();

    return user;
  },

  /**
   * Delete a user.
   */
  async deleteUser(
    userId: string,
    scope: CallerScope
  ): Promise<void> {
    if (
      !mongoose.Types.ObjectId.isValid(
        userId
      )
    ) {
      throw ApiError.badRequest(
        "Invalid user id"
      );
    }

    const user =
      await User.findById(
        userId
      );

    if (!user) {
      throw ApiError.notFound(
        "User not found"
      );
    }

    if (
      user.role ===
      UserRole.SUPER_ADMIN
    ) {
      throw ApiError.forbidden(
        "Super admin accounts cannot be deleted through this endpoint"
      );
    }

    assertSameCompany(
      user,
      scope
    );

    assertCanManageRole(
      user.role,
      scope
    );

    /*
     * Delete technician profile first.
     */
    if (
      user.role ===
      UserRole.TECHNICIAN
    ) {
      await TechnicianProfile.deleteOne({
        userId: user._id,
      });
    }

    await User.deleteOne({
      _id: user._id,
    });
  },
};

/**
 * Generate the next technician employee code.
 *
 * Example:
 * PM-TECH-0001
 * PM-TECH-0002
 */
async function generateEmployeeCode(): Promise<string> {
  const count =
    await TechnicianProfile.countDocuments();

  const next =
    (count + 1)
      .toString()
      .padStart(4, "0");

  return `PM-TECH-${next}`;
}