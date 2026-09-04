import mongoose from "mongoose";
import { randomBytes } from "crypto";
import { RefreshToken } from "../models/RefreshToken";

import {
  User,
  IUser,
  UserRole,
} from "../models/User";

import {
  TechnicianProfile,
  DutyStatus,
} from "../models/TechnicianProfile";

import {
  Project,
  ProjectStatus,
} from "../models/Project";

import {
  Branch,
} from "../models/Branch";

import { Company } from "../models/Company";

import {
  ApiError,
} from "../utils/ApiError";

import {
  CreateUserInput,
  OtpAccessInput,
  ResetUserPasswordInput,
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
 *
 * Super Admin can access all companies.
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
 * Check whether the target user belongs
 * to the caller's branch.
 *
 * Super Admin can manage any branch.
 *
 * Office Admin can only manage users
 * belonging to their own branch.
 */
function assertSameBranch(
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
    scope.role ===
    UserRole.OFFICE_ADMIN
  ) {
    if (
      !scope.branchId ||
      !targetUser.branchId ||
      targetUser.branchId.toString() !==
        scope.branchId
    ) {
      throw ApiError.forbidden(
        "You can only access users belonging to your own branch"
      );
    }
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
   * List staff visible to the caller.
   *
   * Super Admin sees every account, including other Super Admins, so OTP
   * access can be audited centrally. Office Admin sees technicians from
   * their own company + branch only.
   */
  async listUsers(scope: CallerScope): Promise<IUser[]> {
    if (scope.role === UserRole.SUPER_ADMIN) {
      return User.find({}).sort({ role: 1, name: 1 });
    }

    if (scope.role === UserRole.OFFICE_ADMIN) {
      if (!scope.companyId || !scope.branchId) {
        throw ApiError.forbidden("Office admin is not assigned to a company and branch");
      }

      return User.find({
        role: UserRole.TECHNICIAN,
        companyId: scope.companyId,
        branchId: scope.branchId,
      }).sort({ name: 1 });
    }

    throw ApiError.forbidden("You do not have permission to list users");
  },

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
       * Resolve and validate the target branch.
       *
       * Super Admin:
       * - Can select any active branch.
       *
       * Office Admin:
       * - Branch must belong to their own company.
       * - Branch must be their own assigned branch.
       */
      const validatedBranch =
        await getValidatedBranch(
          input.branchId,
          scope.role ===
            UserRole.SUPER_ADMIN
            ? undefined
            : scope.companyId
        );

      if (
        scope.role ===
        UserRole.OFFICE_ADMIN
      ) {
        if (!scope.branchId) {
          throw ApiError.forbidden(
            "Office admin is not assigned to a branch"
          );
        }

        if (
          validatedBranch._id.toString() !==
          scope.branchId
        ) {
          throw ApiError.forbidden(
            "You can only manage users in your own branch"
          );
        }
      }

      companyId =
        validatedBranch.companyId;

      branchId =
        validatedBranch._id;

      if (input.role === UserRole.TECHNICIAN && companyId) {
        const company = await Company.findById(companyId);
        if (!company) throw ApiError.badRequest("Company not found");
        const technicianCount = await User.countDocuments({ companyId, role: UserRole.TECHNICIAN, isActive: true });
        const technicianLimit = company.limits?.technicians ?? 5;
        if (company.subscriptionPlan !== "enterprise" && technicianCount >= technicianLimit) {
          throw ApiError.forbidden(`Technician limit reached for the ${company.subscriptionPlan} plan (${technicianLimit}). Upgrade the plan or increase its limit.`);
        }
      }
    }

    /*
     * Create the user.
     */
    const user =
      await User.create({
        name: input.name,
        phone: input.phone,
        email: input.email,
        // Office Admins receive the password chosen by the Super Admin.
        // Technicians can continue using the field-app OTP flow, so a random
        // internal credential is kept when no password is supplied.
        passwordHash: input.password ?? randomBytes(32).toString("base64url"),
        role: input.role,
        companyId,
        branchId,
        isActive: true,
        otpLoginEnabled:
          scope.role === UserRole.SUPER_ADMIN
            ? Boolean(input.otpLoginEnabled)
            : false,
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
   * Super Admin can set/reset an Office Admin password. This also revokes
   * existing refresh sessions so the new credential becomes authoritative.
   */
  async resetOfficeAdminPassword(
    userId: string,
    input: ResetUserPasswordInput,
    scope: CallerScope
  ): Promise<void> {
    if (scope.role !== UserRole.SUPER_ADMIN) {
      throw ApiError.forbidden("Only a Super Admin can reset admin passwords");
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw ApiError.badRequest("Invalid user id");
    }

    const user = await User.findById(userId).select("+passwordHash +tokenVersion +failedLoginAttempts +lockedUntil");
    if (!user) {
      throw ApiError.notFound("User not found");
    }

    if (user.role !== UserRole.OFFICE_ADMIN) {
      throw ApiError.badRequest("Password reset here is only available for Office Admin accounts");
    }

    user.passwordHash = input.password;
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    await user.save();

    await RefreshToken.updateMany(
      { userId: user._id, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } }
    );
  },

  /**
   * Super-Admin-only OTP whitelist control. This is intentionally separate
   * from the general user update endpoint so Office Admins cannot silently
   * grant login access to newly-created accounts.
   */
  async setOtpAccess(
    userId: string,
    input: OtpAccessInput,
    scope: CallerScope
  ): Promise<IUser> {
    if (scope.role !== UserRole.SUPER_ADMIN) {
      throw ApiError.forbidden("Only a Super Admin can change OTP login access");
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw ApiError.badRequest("Invalid user id");
    }

    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound("User not found");
    }

    if (input.enabled && !user.isActive) {
      throw ApiError.badRequest("Activate this account before enabling OTP login");
    }

    if (!input.enabled && user.role === UserRole.SUPER_ADMIN && user.otpLoginEnabled) {
      const otherEnabledSuperAdmins = await User.countDocuments({
        _id: { $ne: user._id },
        role: UserRole.SUPER_ADMIN,
        isActive: true,
        otpLoginEnabled: true,
      });

      if (otherEnabledSuperAdmins === 0) {
        throw ApiError.badRequest(
          "At least one active Super Admin must keep OTP login enabled"
        );
      }
    }

    user.otpLoginEnabled = input.enabled;
    await user.save();
    return user;
  },

  /**
   * Update a user.
   *
   * Super Admin:
   * - can update Office Admin
   * - can update Technician
   * - can manage any company/branch
   *
   * Office Admin:
   * - can update Technician only
   * - technician must belong to own company
   * - technician must belong to own branch
   * - technician cannot be moved to another branch
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

    /*
     * Office Admin must belong to
     * the same company AND branch.
     */
    assertSameCompany(
      user,
      scope
    );

    assertSameBranch(
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
     * Branch changes are validated.
     */
    if (input.branchId) {
      /*
       * Office Admin:
       * The new branch MUST be their own branch.
       */
      if (
        scope.role ===
        UserRole.OFFICE_ADMIN
      ) {
        if (!scope.branchId) {
          throw ApiError.forbidden(
            "Office admin is not assigned to a branch"
          );
        }

        if (
          input.branchId !==
          scope.branchId
        ) {
          throw ApiError.forbidden(
            "You can only assign users to your own branch"
          );
        }
      }

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
       *
       * Only Super Admin can move a user
       * between companies.
       */
      if (
        user.companyId &&
        user.companyId.toString() !==
          newCompanyId.toString()
      ) {
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
   * Deactivate a user without destroying historical business records.
   *
   * Super Admin:
   * - can deactivate Office Admin
   * - can deactivate Technician
   * - can manage any company/branch
   *
   * Office Admin:
   * - can deactivate Technician only
   * - technician must belong to own company
   * - technician must belong to own branch
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
      ).select("+tokenVersion");

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
        "Super admin accounts cannot be deactivated through this endpoint"
      );
    }

    /*
     * Office Admin must only be able
     * to deactivate technicians from their
     * own company and own branch.
     */
    assertSameCompany(
      user,
      scope
    );

    assertSameBranch(
      user,
      scope
    );

    assertCanManageRole(
      user.role,
      scope
    );

    /*
     * Do not strand an active customer job on an account that can no longer
     * sign in. The admin must reassign or cancel those jobs first.
     */
    if (
      user.role ===
      UserRole.TECHNICIAN
    ) {
      const activeAssignment = await Project.exists({
        assignedTechnicianId: user._id,
        status: {
          $nin: [
            ProjectStatus.COMPLETED,
            ProjectStatus.CANCELLED,
          ],
        },
      });

      if (activeAssignment) {
        throw ApiError.conflict(
          "Reassign or cancel this technician's active jobs before deactivating the account"
        );
      }
    }

    user.isActive = false;
    user.otpLoginEnabled = false;
    user.tokenVersion =
      (user.tokenVersion ?? 0) + 1;

    await user.save();

    await Promise.all([
      RefreshToken.updateMany(
        {
          userId: user._id,
          revokedAt: { $exists: false },
        },
        { $set: { revokedAt: new Date() } }
      ),
      user.role === UserRole.TECHNICIAN
        ? TechnicianProfile.updateOne(
            { userId: user._id },
            {
              $set: {
                currentDutyStatus: DutyStatus.OFF_DUTY,
                lastStatusChangeAt: new Date(),
              },
              $unset: {
                lastKnownLocation: 1,
              },
            }
          )
        : Promise.resolve(),
    ]);
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
