import mongoose, { FilterQuery } from "mongoose";
import {
  ServiceContract,
  IServiceContract,
  ContractFrequency,
  ContractStatus,
  ContractVisitStatus,
  IContractVisit,
} from "../models/ServiceContract";
import { UserRole } from "../models/User";
import { ApiError } from "../utils/ApiError";
import { CallerScope } from "../utils/callerScope";
import { projectService } from "./project.service";
import {
  CreateServiceContractInput,
  UpdateServiceContractInput,
} from "../validators/serviceContract.validators";

const oid = (value: string) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw ApiError.badRequest("Invalid id");
  }
  return new mongoose.Types.ObjectId(value);
};

function tenant(scope: CallerScope): FilterQuery<IServiceContract> {
  if (scope.role === UserRole.SUPER_ADMIN) return {};
  if (!scope.companyId || !scope.branchId) {
    throw ApiError.forbidden("Your account is not linked to a company and branch");
  }
  return {
    companyId: oid(scope.companyId),
    branchId: oid(scope.branchId),
  };
}

function intervalDays(frequency: ContractFrequency, custom?: number) {
  return frequency === ContractFrequency.MONTHLY
    ? 30
    : frequency === ContractFrequency.BIMONTHLY
      ? 60
      : frequency === ContractFrequency.QUARTERLY
        ? 91
        : frequency === ContractFrequency.HALF_YEARLY
          ? 182
          : frequency === ContractFrequency.ANNUAL
            ? 365
            : custom || 30;
}

function dateKey(value: Date) {
  return new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
  ).getTime();
}

function buildSchedule(
  start: Date,
  end: Date,
  count: number,
  frequency: ContractFrequency,
  custom?: number,
): IContractVisit[] {
  const visits: IContractVisit[] = [];
  const days = intervalDays(frequency, custom);

  for (let i = 0; i < count; i += 1) {
    const dueDate = new Date(start);
    dueDate.setDate(dueDate.getDate() + Math.round(i * days));
    if (dueDate > end) break;
    visits.push({ dueDate, status: ContractVisitStatus.UPCOMING });
  }

  if (visits.length !== count) {
    throw ApiError.badRequest(
      `The selected contract period can fit only ${visits.length} visit(s) at this frequency. Extend the end date, reduce included visits, or choose a shorter interval.`,
    );
  }

  return visits;
}

function reschedulePreservingHistory(
  contract: IServiceContract,
  start: Date,
  end: Date,
  count: number,
  frequency: ContractFrequency,
  custom?: number,
): IContractVisit[] {
  const protectedVisits = contract.visits.filter(
    (visit) =>
      Boolean(visit.projectId) || visit.status !== ContractVisitStatus.UPCOMING,
  );

  if (protectedVisits.length > count) {
    throw ApiError.badRequest(
      `Included visits cannot be reduced below ${protectedVisits.length} because those visits already have history or linked projects.`,
    );
  }

  const desired = buildSchedule(start, end, count, frequency, custom);
  const existingUpcomingByDate = new Map(
    contract.visits
      .filter(
        (visit) =>
          !visit.projectId && visit.status === ContractVisitStatus.UPCOMING,
      )
      .map((visit) => [dateKey(new Date(visit.dueDate)), visit]),
  );

  const result: IContractVisit[] = [...protectedVisits];
  const usedDates = new Set(
    protectedVisits.map((visit) => dateKey(new Date(visit.dueDate))),
  );

  for (const planned of desired) {
    if (result.length >= count) break;
    const key = dateKey(new Date(planned.dueDate));
    if (usedDates.has(key)) continue;

    const existing = existingUpcomingByDate.get(key);
    result.push(existing || planned);
    usedDates.add(key);
  }

  // Protected historical visits can consume slots that no longer line up with
  // the new schedule. Fill any remaining entitlement with planned dates.
  if (result.length < count) {
    for (const planned of desired) {
      if (result.length >= count) break;
      const key = dateKey(new Date(planned.dueDate));
      if (usedDates.has(key)) continue;
      result.push(planned);
      usedDates.add(key);
    }
  }

  if (result.length !== count) {
    throw ApiError.badRequest(
      "Could not rebuild the visit schedule without losing existing service history.",
    );
  }

  return result.sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
  );
}

async function nextContractNumber() {
  const year = new Date().getFullYear();
  const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);

  for (let i = 0; i < 20; i += 1) {
    const sequence =
      (await ServiceContract.countDocuments({ createdAt: { $gte: yearStart } })) +
      1 +
      i;
    const candidate = `PM-AMC-${year}-${String(sequence).padStart(5, "0")}`;
    if (!(await ServiceContract.exists({ contractNumber: candidate }))) {
      return candidate;
    }
  }

  throw ApiError.internal("Could not generate contract number");
}

function refreshStatus(contract: IServiceContract) {
  if (
    contract.status === ContractStatus.CANCELLED ||
    contract.status === ContractStatus.PAUSED
  ) {
    return;
  }
  if (contract.endDate.getTime() < Date.now()) {
    contract.status = ContractStatus.EXPIRED;
  }
}

async function visible(id: string, scope: CallerScope) {
  const contract = await ServiceContract.findOne({
    _id: oid(id),
    ...tenant(scope),
  });
  if (!contract) throw ApiError.notFound("Service contract not found");

  const before = contract.status;
  refreshStatus(contract);
  if (before !== contract.status) await contract.save();
  return contract;
}

function resolveTenantForCreate(
  input: CreateServiceContractInput,
  scope: CallerScope,
) {
  let companyId = scope.companyId ? oid(scope.companyId) : undefined;
  let branchId = scope.branchId ? oid(scope.branchId) : undefined;

  if (scope.role === UserRole.SUPER_ADMIN) {
    companyId = input.companyId ? oid(input.companyId) : companyId;
    branchId = input.branchId ? oid(input.branchId) : branchId;
  }

  return { companyId, branchId };
}

export const serviceContractService = {
  async list(
    scope: CallerScope,
    query: { status?: ContractStatus; search?: string },
  ) {
    const filter: FilterQuery<IServiceContract> = { ...tenant(scope) };
    if (query.status) filter.status = query.status;
    if (query.search) {
      filter.$or = [
        { contractNumber: { $regex: query.search, $options: "i" } },
        { customerName: { $regex: query.search, $options: "i" } },
        { customerPhone: { $regex: query.search, $options: "i" } },
      ];
    }

    const rows = await ServiceContract.find(filter).sort({ createdAt: -1 });
    await Promise.all(
      rows.map(async (contract) => {
        const before = contract.status;
        refreshStatus(contract);
        if (before !== contract.status) await contract.save();
      }),
    );
    return rows;
  },

  get: (id: string, scope: CallerScope) => visible(id, scope),

  async create(input: CreateServiceContractInput, scope: CallerScope) {
    const { companyId, branchId } = resolveTenantForCreate(input, scope);
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);
    const visits = buildSchedule(
      startDate,
      endDate,
      input.includedVisits,
      input.frequency,
      input.customIntervalDays,
    );

    return ServiceContract.create({
      ...input,
      customerEmail: input.customerEmail || undefined,
      companyId,
      branchId,
      contractNumber: await nextContractNumber(),
      startDate,
      endDate,
      status: ContractStatus.ACTIVE,
      visits,
      createdBy: oid(scope.userId),
    });
  },

  async update(
    id: string,
    input: UpdateServiceContractInput,
    scope: CallerScope,
  ) {
    const contract = await visible(id, scope);
    if (contract.status === ContractStatus.CANCELLED) {
      throw ApiError.badRequest("Cancelled contracts cannot be edited");
    }

    const nextStart = input.startDate
      ? new Date(input.startDate)
      : contract.startDate;
    const nextEnd = input.endDate ? new Date(input.endDate) : contract.endDate;
    const nextFrequency = input.frequency ?? contract.frequency;
    const nextCustomInterval =
      input.customIntervalDays ?? contract.customIntervalDays;
    const nextIncludedVisits = input.includedVisits ?? contract.includedVisits;

    if (nextEnd <= nextStart) {
      throw ApiError.badRequest("End date must be after start date");
    }
    if (
      nextFrequency === ContractFrequency.CUSTOM &&
      !nextCustomInterval
    ) {
      throw ApiError.badRequest("Custom interval is required");
    }

    const scheduleChanged = Boolean(
      input.startDate ||
        input.endDate ||
        input.includedVisits !== undefined ||
        input.frequency ||
        input.customIntervalDays !== undefined,
    );

    const editableFields: Array<keyof UpdateServiceContractInput> = [
      "customerName",
      "customerPhone",
      "customerEmail",
      "address",
      "serviceType",
      "frequency",
      "customIntervalDays",
      "contractValue",
      "includedVisits",
      "notes",
      "terms",
    ];

    for (const key of editableFields) {
      if (input[key] !== undefined) {
        (contract as unknown as Record<string, unknown>)[key] = input[key];
      }
    }

    contract.startDate = nextStart;
    contract.endDate = nextEnd;

    // Tenant reassignment is Super Admin only. Office Admins can never move a
    // contract outside their own company/branch via PATCH payloads.
    if (scope.role === UserRole.SUPER_ADMIN) {
      if (input.companyId !== undefined) {
        contract.companyId = input.companyId ? oid(input.companyId) : undefined;
      }
      if (input.branchId !== undefined) {
        contract.branchId = input.branchId ? oid(input.branchId) : undefined;
      }
    }

    if (scheduleChanged) {
      contract.visits = reschedulePreservingHistory(
        contract,
        nextStart,
        nextEnd,
        nextIncludedVisits,
        nextFrequency,
        nextCustomInterval,
      ) as typeof contract.visits;
    }

    await contract.save();
    return contract;
  },

  async status(id: string, status: ContractStatus, scope: CallerScope) {
    const contract = await visible(id, scope);

    if (contract.status === ContractStatus.CANCELLED) {
      throw ApiError.badRequest("Cancelled contract is final");
    }
    if (
      status === ContractStatus.ACTIVE &&
      contract.endDate.getTime() < Date.now()
    ) {
      throw ApiError.badRequest(
        "Expired contracts cannot be reactivated. Renew the contract instead.",
      );
    }

    contract.status = status;
    await contract.save();
    return contract;
  },

  async generateVisit(id: string, visitId: string, scope: CallerScope) {
    const contract = await visible(id, scope);
    if (contract.status !== ContractStatus.ACTIVE) {
      throw ApiError.badRequest("Contract must be active");
    }

    const visits = contract.visits as unknown as {
      id?: (id: string) => IContractVisit | null;
      find: (fn: (item: IContractVisit & { _id?: mongoose.Types.ObjectId }) => boolean) =>
        | IContractVisit
        | undefined;
    };
    const visit = visits.id
      ? visits.id(visitId)
      : visits.find((item) => item._id?.toString() === visitId);

    if (!visit) throw ApiError.notFound("Visit not found");
    if (visit.projectId) {
      throw ApiError.conflict("A project already exists for this visit");
    }

    const project = await projectService.createProject(
      {
        customerName: contract.customerName,
        customerPhone: contract.customerPhone,
        address: contract.address,
        serviceType: contract.serviceType,
        companyId: contract.companyId?.toString(),
        branchId: contract.branchId?.toString(),
        notes: `AMC ${contract.contractNumber} • Scheduled visit ${new Date(
          visit.dueDate,
        ).toLocaleDateString("en-IN")}${contract.notes ? ` • ${contract.notes}` : ""}`,
      },
      scope,
    );

    visit.projectId = project._id;
    visit.status = ContractVisitStatus.PROJECT_CREATED;
    await contract.save();
    return { contract, project };
  },

  async renew(id: string, scope: CallerScope) {
    const contract = await visible(id, scope);
    if (contract.status === ContractStatus.CANCELLED) {
      throw ApiError.badRequest("Cancelled contracts cannot be renewed");
    }

    if (
      contract.renewedTo ||
      (await ServiceContract.exists({ renewedFrom: contract._id }))
    ) {
      throw ApiError.conflict("This contract has already been renewed");
    }

    const duration = contract.endDate.getTime() - contract.startDate.getTime();
    const startDate = new Date(contract.endDate);
    startDate.setDate(startDate.getDate() + 1);
    const endDate = new Date(startDate.getTime() + duration);
    const visits = buildSchedule(
      startDate,
      endDate,
      contract.includedVisits,
      contract.frequency,
      contract.customIntervalDays,
    );

    try {
      const renewed = await ServiceContract.create({
        companyId: contract.companyId,
        branchId: contract.branchId,
        contractNumber: await nextContractNumber(),
        customerName: contract.customerName,
        customerPhone: contract.customerPhone,
        customerEmail: contract.customerEmail || undefined,
        address: contract.address,
        serviceType: contract.serviceType,
        frequency: contract.frequency,
        customIntervalDays: contract.customIntervalDays,
        startDate,
        endDate,
        contractValue: contract.contractValue,
        includedVisits: contract.includedVisits,
        status: ContractStatus.ACTIVE,
        notes: contract.notes,
        terms: contract.terms,
        visits,
        renewedFrom: contract._id,
        createdBy: oid(scope.userId),
      });

      contract.renewedTo = renewed._id;
      await contract.save();
      return renewed;
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: number }).code === 11000
      ) {
        throw ApiError.conflict("This contract has already been renewed");
      }
      throw error;
    }
  },
};
