import { User, UserRole, IUser } from "../models/User";
import { TechnicianProfile, DutyStatus, ITechnicianProfile } from "../models/TechnicianProfile";
import { DutyLog } from "../models/DutyLog";
import { ApiError } from "../utils/ApiError";

export interface TechnicianListItem {
  user: IUser;
  profile: ITechnicianProfile;
}

export const technicianService = {
  /** Admin-facing list, used to populate the "assign technician" dropdown. */
  async listTechnicians(): Promise<TechnicianListItem[]> {
    const technicians = await User.find({ role: UserRole.TECHNICIAN, isActive: true });
    const profiles = await TechnicianProfile.find({
      userId: { $in: technicians.map((t) => t._id) },
    });
    const profileByUserId = new Map(profiles.map((p) => [p.userId.toString(), p]));

    return technicians
      .map((user) => {
        const profile = profileByUserId.get(user._id.toString());
        return profile ? { user, profile } : null;
      })
      .filter((item): item is TechnicianListItem => item !== null);
  },

  /**
   * A technician's own duty status. The existing list above is
   * admin-only (requireRole SUPER_ADMIN/OFFICE_ADMIN) since it
   * returns every technician — this is the narrow, technician-safe
   * counterpart: derives the id from the caller's own verified JWT
   * (never a param), returns only their own profile.
   */
  async getOwnProfile(userId: string): Promise<ITechnicianProfile> {
    const profile = await TechnicianProfile.findOne({ userId });
    if (!profile) throw ApiError.notFound("Technician profile not found");
    return profile;
  },

  /**
   * Atomic conditional update (findOneAndUpdate with a status
   * guard), same reasoning as project.service.ts's assign/status
   * writes: closes the race window between reading the current
   * duty status and writing the new one, e.g. a double-tap or two
   * open tabs both submitting "Start Duty" at once.
   */
  async startDuty(technicianId: string): Promise<ITechnicianProfile> {
    const now = new Date();

    const updated = await TechnicianProfile.findOneAndUpdate(
      { userId: technicianId, currentDutyStatus: DutyStatus.OFF_DUTY },
      { $set: { currentDutyStatus: DutyStatus.ON_DUTY_IDLE, lastStatusChangeAt: now } },
      { new: true }
    );

    if (!updated) {
      const exists = await TechnicianProfile.exists({ userId: technicianId });
      throw exists
        ? ApiError.badRequest("Duty is already active")
        : ApiError.notFound("Technician profile not found");
    }

    await DutyLog.create({ technicianId, dutyStartAt: now });

    return updated;
  },

  async endDuty(technicianId: string): Promise<ITechnicianProfile> {
    const now = new Date();

    const updated = await TechnicianProfile.findOneAndUpdate(
      { userId: technicianId, currentDutyStatus: { $ne: DutyStatus.OFF_DUTY } },
      { $set: { currentDutyStatus: DutyStatus.OFF_DUTY, lastStatusChangeAt: now } },
      { new: true }
    );

    if (!updated) {
      const exists = await TechnicianProfile.exists({ userId: technicianId });
      throw exists
        ? ApiError.badRequest("Duty is not currently active")
        : ApiError.notFound("Technician profile not found");
    }

    const openLog = await DutyLog.findOne({ technicianId, dutyEndAt: { $exists: false } }).sort({
      dutyStartAt: -1,
    });
    if (openLog) {
      openLog.dutyEndAt = now;
      await openLog.save();
    }

    return updated;
  },
};
