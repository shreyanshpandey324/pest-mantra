import mongoose, { FilterQuery } from "mongoose";
import { Branch } from "../models/Branch";
import {
  ILead,
  Lead,
  LeadActivityType,
  LeadPriority,
  LeadSource,
  LeadStatus,
} from "../models/Lead";
import { User, UserRole } from "../models/User";
import { ApiError } from "../utils/ApiError";
import { CallerScope } from "../utils/callerScope";
import {
  AddLeadActivityInput,
  CreateLeadInput,
  ListLeadsInput,
  UpdateLeadInput,
  UpdateLeadStatusInput,
} from "../validators/lead.validators";

const OPEN_STATUSES = [
  LeadStatus.NEW,
  LeadStatus.CONTACTED,
  LeadStatus.FOLLOW_UP,
  LeadStatus.QUALIFIED,
  LeadStatus.QUOTATION_SENT,
];

const STATUS_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  [LeadStatus.NEW]: [LeadStatus.CONTACTED, LeadStatus.FOLLOW_UP, LeadStatus.QUALIFIED, LeadStatus.LOST],
  [LeadStatus.CONTACTED]: [LeadStatus.FOLLOW_UP, LeadStatus.QUALIFIED, LeadStatus.LOST],
  [LeadStatus.FOLLOW_UP]: [LeadStatus.CONTACTED, LeadStatus.QUALIFIED, LeadStatus.LOST],
  [LeadStatus.QUALIFIED]: [LeadStatus.FOLLOW_UP, LeadStatus.QUOTATION_SENT, LeadStatus.WON, LeadStatus.LOST],
  [LeadStatus.QUOTATION_SENT]: [LeadStatus.FOLLOW_UP, LeadStatus.WON, LeadStatus.LOST],
  [LeadStatus.WON]: [],
  [LeadStatus.LOST]: [LeadStatus.FOLLOW_UP],
};

function objectId(value: string, message = "Invalid id") {
  if (!mongoose.Types.ObjectId.isValid(value)) throw ApiError.badRequest(message);
  return new mongoose.Types.ObjectId(value);
}

function tenantFilter(scope: CallerScope): FilterQuery<ILead> {
  if (scope.role === UserRole.SUPER_ADMIN) return {};
  if (!scope.companyId || !mongoose.Types.ObjectId.isValid(scope.companyId)) {
    throw ApiError.forbidden("Your account is not linked to a valid company");
  }
  if (!scope.branchId || !mongoose.Types.ObjectId.isValid(scope.branchId)) {
    throw ApiError.forbidden("Your account is not linked to a valid branch");
  }
  return {
    companyId: new mongoose.Types.ObjectId(scope.companyId),
    branchId: new mongoose.Types.ObjectId(scope.branchId),
  };
}

async function resolveOwnership(input: { companyId?: string; branchId?: string }, scope: CallerScope) {
  if (scope.role === UserRole.SUPER_ADMIN) {
    if (!input.companyId || !input.branchId) {
      throw ApiError.badRequest("Company and branch are required when a Super Admin creates a lead");
    }
    const companyId = objectId(input.companyId, "Invalid company id");
    const branchId = objectId(input.branchId, "Invalid branch id");
    const branch = await Branch.findOne({ _id: branchId, companyId, isActive: true }).select("_id");
    if (!branch) throw ApiError.badRequest("Branch is inactive or outside the selected company");
    return { companyId, branchId };
  }

  if (!scope.companyId || !scope.branchId) throw ApiError.forbidden("Your account is not linked to a company and branch");
  if (input.companyId && input.companyId !== scope.companyId) throw ApiError.forbidden("You cannot create a lead outside your company");
  if (input.branchId && input.branchId !== scope.branchId) throw ApiError.forbidden("You cannot create a lead outside your branch");
  return { companyId: objectId(scope.companyId), branchId: objectId(scope.branchId) };
}

async function validateAssignee(
  assignedTo: string | undefined,
  ownership: { companyId: mongoose.Types.ObjectId; branchId: mongoose.Types.ObjectId },
  scope: CallerScope,
) {
  const id = assignedTo ? objectId(assignedTo, "Invalid assignee id") : objectId(scope.userId, "Invalid current user id");
  const user = await User.findById(id).select("_id name role companyId branchId isActive");
  if (!user || !user.isActive) throw ApiError.badRequest("Selected assignee is not active");
  if (![UserRole.SUPER_ADMIN, UserRole.OFFICE_ADMIN].includes(user.role)) {
    throw ApiError.badRequest("Leads can only be assigned to an admin user");
  }
  if (user.role === UserRole.OFFICE_ADMIN) {
    if (!user.companyId || user.companyId.toString() !== ownership.companyId.toString()) {
      throw ApiError.forbidden("Selected assignee belongs to another company");
    }
    if (!user.branchId || user.branchId.toString() !== ownership.branchId.toString()) {
      throw ApiError.forbidden("Selected assignee belongs to another branch");
    }
  }
  if (scope.role === UserRole.OFFICE_ADMIN && id.toString() !== scope.userId) {
    if (user.role !== UserRole.OFFICE_ADMIN || user.companyId?.toString() !== scope.companyId || user.branchId?.toString() !== scope.branchId) {
      throw ApiError.forbidden("You can only assign leads within your own branch");
    }
  }
  return id;
}

async function generateLeadNumber() {
  const year = new Date().getFullYear();
  const start = new Date(`${year}-01-01T00:00:00.000Z`);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const count = await Lead.countDocuments({ createdAt: { $gte: start } });
    const value = `PM-L-${year}-${String(count + 1 + attempt).padStart(5, "0")}`;
    if (!(await Lead.exists({ leadNumber: value }))) return value;
  }
  throw ApiError.internal("Could not generate a unique lead number");
}

function safeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function visibleLead(id: string, scope: CallerScope) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw ApiError.notFound("Lead not found");
  const lead = await Lead.findOne({ _id: id, ...tenantFilter(scope) });
  if (!lead) throw ApiError.notFound("Lead not found");
  return lead;
}

function dayStart(value = new Date()) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(value: Date, amount: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
}

async function assigneeNames(ids: mongoose.Types.ObjectId[]) {
  if (!ids.length) return new Map<string, string>();
  const users = await User.find({ _id: { $in: ids } }).select("_id name");
  return new Map(users.map((user) => [user._id.toString(), user.name]));
}

function serializeLead(lead: ILead, assigneeName?: string) {
  return {
    _id: lead._id.toString(),
    companyId: lead.companyId.toString(),
    branchId: lead.branchId.toString(),
    leadNumber: lead.leadNumber,
    customerName: lead.customerName,
    customerPhone: lead.customerPhone,
    customerEmail: lead.customerEmail,
    address: lead.address,
    city: lead.city,
    serviceType: lead.serviceType,
    source: lead.source,
    sourceDetail: lead.sourceDetail,
    priority: lead.priority,
    status: lead.status,
    assignedTo: lead.assignedTo.toString(),
    assignedToName: assigneeName,
    followUpAt: lead.followUpAt?.toISOString(),
    siteVisitAt: lead.siteVisitAt?.toISOString(),
    notes: lead.notes,
    lostReason: lead.lostReason,
    quotationId: lead.quotationId?.toString(),
    wonAt: lead.wonAt?.toISOString(),
    lostAt: lead.lostAt?.toISOString(),
    createdBy: lead.createdBy.toString(),
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}

async function metrics(scope: CallerScope) {
  const tenant = tenantFilter(scope);
  const today = dayStart();
  const tomorrow = addDays(today, 1);
  const [total, open, qualified, won, lost, overdueFollowUps, dueToday, hot, sourceRows] = await Promise.all([
    Lead.countDocuments(tenant),
    Lead.countDocuments({ ...tenant, status: { $in: OPEN_STATUSES } }),
    Lead.countDocuments({ ...tenant, status: LeadStatus.QUALIFIED }),
    Lead.countDocuments({ ...tenant, status: LeadStatus.WON }),
    Lead.countDocuments({ ...tenant, status: LeadStatus.LOST }),
    Lead.countDocuments({ ...tenant, status: { $in: OPEN_STATUSES }, followUpAt: { $lt: today } }),
    Lead.countDocuments({ ...tenant, status: { $in: OPEN_STATUSES }, followUpAt: { $gte: today, $lt: tomorrow } }),
    Lead.countDocuments({ ...tenant, status: { $in: OPEN_STATUSES }, priority: LeadPriority.HOT }),
    Lead.aggregate<{ _id: LeadSource; count: number }>([
      { $match: tenant },
      { $group: { _id: "$source", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);
  const closed = won + lost;
  return {
    total,
    open,
    qualified,
    won,
    lost,
    overdueFollowUps,
    dueToday,
    hot,
    conversionRate: closed ? Math.round((won / closed) * 100) : 0,
    sourceBreakdown: sourceRows.map((row) => ({ source: row._id, count: row.count })),
  };
}

export const leadService = {
  async list(scope: CallerScope, query: ListLeadsInput) {
    const conditions: FilterQuery<ILead>[] = [{ ...tenantFilter(scope) }];
    if (query.search) {
      const search = safeRegex(query.search);
      conditions.push({
        $or: [
          { leadNumber: { $regex: search, $options: "i" } },
          { customerName: { $regex: search, $options: "i" } },
          { customerPhone: { $regex: search, $options: "i" } },
          { customerEmail: { $regex: search, $options: "i" } },
          { address: { $regex: search, $options: "i" } },
        ],
      });
    }
    if (query.status) conditions.push({ status: query.status });
    if (query.priority) conditions.push({ priority: query.priority });
    if (query.source) conditions.push({ source: query.source });
    if (query.serviceType) conditions.push({ serviceType: query.serviceType });
    if (query.assignedTo) conditions.push({ assignedTo: objectId(query.assignedTo, "Invalid assignee filter") });
    if (query.overdue === "true") conditions.push({ status: { $in: OPEN_STATUSES }, followUpAt: { $lt: dayStart() } });
    if (query.overdue === "false") conditions.push({ $or: [{ followUpAt: { $gte: dayStart() } }, { followUpAt: { $exists: false } }] });
    if (query.from) conditions.push({ createdAt: { $gte: dayStart(new Date(query.from)) } });
    if (query.to) conditions.push({ createdAt: { $lt: addDays(dayStart(new Date(query.to)), 1) } });

    const filter: FilterQuery<ILead> = conditions.length === 1 ? conditions[0] : { $and: conditions };
    const [total, leadMetrics] = await Promise.all([Lead.countDocuments(filter), metrics(scope)]);
    const totalPages = total ? Math.ceil(total / query.pageSize) : 0;
    const page = totalPages ? Math.min(query.page, totalPages) : 1;
    const sort: Record<string, 1 | -1> = query.sort === "created_desc"
      ? { createdAt: -1, _id: -1 }
      : query.sort === "follow_up_asc"
        ? { followUpAt: 1, updatedAt: -1 }
        : { updatedAt: -1, _id: -1 };

    const leads = await Lead.find(filter)
      .sort(sort)
      .skip((page - 1) * query.pageSize)
      .limit(query.pageSize);
    const nameMap = await assigneeNames(leads.map((lead) => lead.assignedTo));

    return {
      leads: leads.map((lead) => serializeLead(lead, nameMap.get(lead.assignedTo.toString()))),
      metrics: leadMetrics,
      pagination: {
        page,
        pageSize: query.pageSize,
        total,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: totalPages > 0 && page < totalPages,
      },
    };
  },

  async get(id: string, scope: CallerScope) {
    const lead = await visibleLead(id, scope);
    const actorIds = [lead.assignedTo, ...lead.activities.map((item) => item.actorId)];
    const users = await User.find({ _id: { $in: actorIds } }).select("_id name role");
    const usersMap = new Map(users.map((user) => [user._id.toString(), { name: user.name, role: user.role }]));
    return {
      ...serializeLead(lead, usersMap.get(lead.assignedTo.toString())?.name),
      activities: [...lead.activities]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((item) => ({
          _id: item._id?.toString(),
          type: item.type,
          note: item.note,
          actorId: item.actorId.toString(),
          actorName: usersMap.get(item.actorId.toString())?.name,
          fromStatus: item.fromStatus,
          toStatus: item.toStatus,
          scheduledFor: item.scheduledFor?.toISOString(),
          createdAt: item.createdAt.toISOString(),
        })),
    };
  },

  async create(input: CreateLeadInput, scope: CallerScope) {
    const ownership = await resolveOwnership(input, scope);
    const assignedTo = await validateAssignee(input.assignedTo, ownership, scope);
    const now = new Date();
    const lead = await Lead.create({
      ...input,
      companyId: ownership.companyId,
      branchId: ownership.branchId,
      customerEmail: input.customerEmail || undefined,
      followUpAt: input.followUpAt ? new Date(input.followUpAt) : undefined,
      siteVisitAt: input.siteVisitAt ? new Date(input.siteVisitAt) : undefined,
      assignedTo,
      leadNumber: await generateLeadNumber(),
      status: LeadStatus.NEW,
      createdBy: objectId(scope.userId, "Invalid current user id"),
      activities: [{
        type: LeadActivityType.NOTE,
        note: input.notes ? `Lead created. ${input.notes}` : "Lead created",
        actorId: objectId(scope.userId),
        createdAt: now,
      }],
    });
    return this.get(lead._id.toString(), scope);
  },

  async update(id: string, input: UpdateLeadInput, scope: CallerScope) {
    const lead = await visibleLead(id, scope);
    const ownership = { companyId: lead.companyId, branchId: lead.branchId };
    if (input.companyId || input.branchId) {
      const resolved = await resolveOwnership(
        { companyId: input.companyId ?? lead.companyId.toString(), branchId: input.branchId ?? lead.branchId.toString() },
        scope,
      );
      ownership.companyId = resolved.companyId;
      ownership.branchId = resolved.branchId;
    }
    if (input.assignedTo) lead.assignedTo = await validateAssignee(input.assignedTo, ownership, scope);
    lead.companyId = ownership.companyId;
    lead.branchId = ownership.branchId;
    if (input.customerName !== undefined) lead.customerName = input.customerName;
    if (input.customerPhone !== undefined) lead.customerPhone = input.customerPhone;
    if (input.customerEmail !== undefined) lead.customerEmail = input.customerEmail || undefined;
    if (input.address !== undefined) lead.address = input.address || undefined;
    if (input.city !== undefined) lead.city = input.city || undefined;
    if (input.serviceType !== undefined) lead.serviceType = input.serviceType;
    if (input.source !== undefined) lead.source = input.source;
    if (input.sourceDetail !== undefined) lead.sourceDetail = input.sourceDetail || undefined;
    if (input.priority !== undefined) lead.priority = input.priority;
    if (input.followUpAt !== undefined) lead.followUpAt = input.followUpAt ? new Date(input.followUpAt) : undefined;
    if (input.siteVisitAt !== undefined) lead.siteVisitAt = input.siteVisitAt ? new Date(input.siteVisitAt) : undefined;
    if (input.notes !== undefined) lead.notes = input.notes || undefined;
    await lead.save();
    return this.get(lead._id.toString(), scope);
  },

  async updateStatus(id: string, input: UpdateLeadStatusInput, scope: CallerScope) {
    const lead = await visibleLead(id, scope);
    if (input.status === lead.status) return this.get(id, scope);
    if (!STATUS_TRANSITIONS[lead.status].includes(input.status)) {
      throw ApiError.badRequest(`Cannot move a lead from ${lead.status} to ${input.status}`);
    }
    if (input.status === LeadStatus.LOST && !input.lostReason?.trim()) {
      throw ApiError.badRequest("A lost reason is required when closing a lead as lost");
    }
    const previous = lead.status;
    lead.status = input.status;
    if (input.status === LeadStatus.WON) {
      lead.wonAt = new Date();
      lead.lostAt = undefined;
      lead.lostReason = undefined;
    }
    if (input.status === LeadStatus.LOST) {
      lead.lostAt = new Date();
      lead.wonAt = undefined;
      lead.lostReason = input.lostReason?.trim();
    }
    if (input.status === LeadStatus.FOLLOW_UP && previous === LeadStatus.LOST) {
      lead.lostAt = undefined;
      lead.lostReason = undefined;
    }
    lead.activities.push({
      type: LeadActivityType.STATUS_CHANGE,
      note: input.note?.trim() || `Status changed from ${previous} to ${input.status}`,
      actorId: objectId(scope.userId),
      fromStatus: previous,
      toStatus: input.status,
      createdAt: new Date(),
    });
    await lead.save();
    return this.get(id, scope);
  },

  async addActivity(id: string, input: AddLeadActivityInput, scope: CallerScope) {
    const lead = await visibleLead(id, scope);
    const scheduledFor = input.scheduledFor ? new Date(input.scheduledFor) : undefined;
    lead.activities.push({
      type: input.type,
      note: input.note,
      actorId: objectId(scope.userId),
      scheduledFor,
      createdAt: new Date(),
    });
    if (input.type === LeadActivityType.FOLLOW_UP && scheduledFor) {
      lead.followUpAt = scheduledFor;
      if ([LeadStatus.NEW, LeadStatus.CONTACTED].includes(lead.status)) lead.status = LeadStatus.FOLLOW_UP;
    }
    if (input.type === LeadActivityType.SITE_VISIT && scheduledFor) lead.siteVisitAt = scheduledFor;
    if (input.type === LeadActivityType.CALL && lead.status === LeadStatus.NEW) lead.status = LeadStatus.CONTACTED;
    await lead.save();
    return this.get(id, scope);
  },

  async remove(id: string, scope: CallerScope) {
    const lead = await visibleLead(id, scope);
    if (lead.quotationId || lead.status === LeadStatus.WON) {
      throw ApiError.badRequest("Leads linked to a quotation or won business cannot be deleted");
    }
    await lead.deleteOne();
  },

  async assignees(scope: CallerScope, companyId?: string, branchId?: string) {
    let filter: FilterQuery<InstanceType<typeof User>> = { isActive: true } as FilterQuery<InstanceType<typeof User>>;
    if (scope.role === UserRole.OFFICE_ADMIN) {
      if (!scope.companyId || !scope.branchId) throw ApiError.forbidden("Your account is not linked to a company and branch");
      filter = {
        isActive: true,
        role: UserRole.OFFICE_ADMIN,
        companyId: objectId(scope.companyId),
        branchId: objectId(scope.branchId),
      } as FilterQuery<InstanceType<typeof User>>;
    } else {
      const or: Record<string, unknown>[] = [{ role: UserRole.SUPER_ADMIN }];
      if (companyId && branchId) {
        or.push({ role: UserRole.OFFICE_ADMIN, companyId: objectId(companyId), branchId: objectId(branchId) });
      }
      filter = { isActive: true, $or: or } as FilterQuery<InstanceType<typeof User>>;
    }
    const users = await User.find(filter).select("_id name role companyId branchId").sort({ role: 1, name: 1 });
    return users.map((user) => ({
      _id: user._id.toString(),
      name: user.name,
      role: user.role,
      companyId: user.companyId?.toString(),
      branchId: user.branchId?.toString(),
    }));
  },
};
