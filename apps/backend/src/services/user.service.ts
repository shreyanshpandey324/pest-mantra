import { User, IUser, UserRole } from "../models/User";
import { TechnicianProfile } from "../models/TechnicianProfile";
import { Branch } from "../models/Branch";
import { ApiError } from "../utils/ApiError";
import {
  CreateUserInput,
} from "../validators/auth.validators";
import { UpdateUserInput } from "../validators/auth.validators";
import mongoose from "mongoose";

/**
 * There is no public registration endpoint anywhere in this system.
 * Accounts are created exclusively by an authenticated admin
 * (super_admin creates office_admins; super_admin/office_admin
 * create technicians). This mirrors the real business process —
 * Pest Mantra onboards its own staff, the public never self-registers.
 */
export const userService = {
  async createUser(input: CreateUserInput, createdByRole: UserRole): Promise<IUser> {
    if (input.role === UserRole.SUPER_ADMIN && createdByRole !== UserRole.SUPER_ADMIN) {
      throw ApiError.forbidden("Only a super admin can create another super admin");
    }

    if (input.role !== UserRole.SUPER_ADMIN) {
      if (!input.branchId) {
        throw ApiError.badRequest("branchId is required for this role");
      }
      if (!mongoose.Types.ObjectId.isValid(input.branchId)) {
        throw ApiError.badRequest("branchId is not a valid id");
      }
      const branch = await Branch.findById(input.branchId);
      if (!branch) {
        throw ApiError.badRequest("branchId does not refer to an existing branch");
      }
    }

    const existing = await User.findOne({ phone: input.phone });
    if (existing) {
      throw ApiError.conflict("A user with this phone number already exists");
    }

    const user = await User.create({
      name: input.name,
      phone: input.phone,
      email: input.email,
      passwordHash: input.password, // pre-save hook will hash it
      role: input.role,
      branchId:
        input.role === UserRole.SUPER_ADMIN
          ? undefined
          : input.branchId,
    });

    if (input.role === UserRole.TECHNICIAN) {
      const employeeCode = await generateEmployeeCode();

      await TechnicianProfile.create({
        userId: user._id,
        employeeCode,
      });
    }

    return user;
  },async updateUser(
  userId: string,
  input: UpdateUserInput
): Promise<IUser> {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw ApiError.badRequest("Invalid user id");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  if (
    input.phone !== user.phone
  ) {
    const existing = await User.findOne({
      phone: input.phone,
      _id: { $ne: user._id },
    });

    if (existing) {
      throw ApiError.conflict(
        "Phone number already exists"
      );
    }
  }

  if (input.branchId) {
    const branch =
      await Branch.findById(
        input.branchId
      );

    if (!branch) {
      throw ApiError.badRequest(
        "Invalid branch"
      );
    }

    user.branchId =
      new mongoose.Types.ObjectId(
        input.branchId
      );
  }

  user.name = input.name;
  user.phone = input.phone;
  user.email = input.email;

  await user.save();

  return user;
},

  async deleteUser(userId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw ApiError.badRequest("Invalid user id");
    }

    const user = await User.findById(userId);

    if (!user) {
      throw ApiError.notFound("User not found");
    }

    if (user.role === UserRole.TECHNICIAN) {
      await TechnicianProfile.deleteOne({
        userId: user._id,
      });
    }

    await User.deleteOne({
      _id: user._id,
    });
  },
};

async function generateEmployeeCode(): Promise<string> {
  const count = await TechnicianProfile.countDocuments();

  const next = (count + 1)
    .toString()
    .padStart(4, "0");

  return `PM-TECH-${next}`;
}
