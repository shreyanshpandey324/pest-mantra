import crypto from "crypto";
import mongoose from "mongoose";
import { ServiceReport, ServiceReportStatus } from "../models/ServiceReport";
import { Location } from "../models/Location";
import { ProjectStatus } from "../models/Project";
import { ProjectPhoto, PhotoType } from "../models/ProjectPhoto";
import { ProjectChemicalUsage } from "../models/ProjectChemicalUsage";
import { Chemical } from "../models/Chemical";
import { Company } from "../models/Company";
import { Branch } from "../models/Branch";
import { User, UserRole } from "../models/User";
import { ApiError } from "../utils/ApiError";
import { CallerScope } from "../utils/callerScope";
import { projectService } from "./project.service";
import { SaveServiceReportInput } from "../validators/serviceReport.validators";
import { haversineDistanceKm } from "../utils/geo";


function reportTenantFilter(scope: CallerScope): Record<string, unknown> {
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

function normalizeOptional(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function createReportNumber(): string {
  const year = new Date().getFullYear();
  const suffix = `${Date.now().toString(36)}${crypto.randomBytes(2).toString("hex")}`.toUpperCase();
  return `PM-SR-${year}-${suffix}`;
}

function createVerificationCode(): string {
  const raw = crypto.randomBytes(6).toString("hex").toUpperCase();
  return `PMV-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

async function getSnapshotData(projectId: mongoose.Types.ObjectId) {
  const [photos, usage] = await Promise.all([
    ProjectPhoto.find({ projectId }).select("_id photoType uploadedAt").sort({ uploadedAt: 1 }),
    ProjectChemicalUsage.find({ projectId }).select("chemicalId quantityUsed loggedAt").sort({ loggedAt: 1 }),
  ]);

  const chemicalIds = [...new Set(usage.map((entry) => entry.chemicalId.toString()))];
  const chemicals = chemicalIds.length
    ? await Chemical.find({ _id: { $in: chemicalIds } }).select("name unit")
    : [];
  const chemicalMap = new Map(chemicals.map((chemical) => [chemical._id.toString(), chemical]));

  return {
    beforePhotoIds: photos.filter((photo) => photo.photoType === PhotoType.BEFORE).map((photo) => photo._id),
    afterPhotoIds: photos.filter((photo) => photo.photoType === PhotoType.AFTER).map((photo) => photo._id),
    chemicalUsage: usage.map((entry) => {
      const chemical = chemicalMap.get(entry.chemicalId.toString());
      return {
        chemicalId: entry.chemicalId,
        chemicalName: chemical?.name ?? "Chemical",
        unit: chemical?.unit ?? "ml",
        quantityUsed: entry.quantityUsed,
        loggedAt: entry.loggedAt,
      };
    }),
  };
}

async function hydrateReport(report: InstanceType<typeof ServiceReport>, projectId: string) {
  const photos = await ProjectPhoto.find({ projectId }).select("_id photoType fileUrl uploadedAt").sort({ uploadedAt: 1 });
  return {
    report,
    photos: photos.map((photo) => ({
      _id: photo._id,
      photoType: photo.photoType,
      fileUrl: photo.fileUrl,
      uploadedAt: photo.uploadedAt,
    })),
  };
}

export const serviceReportService = {
  async list(scope: CallerScope) {
    return ServiceReport.find(reportTenantFilter(scope))
      .select(
        "projectId projectCode reportNumber verificationCode status customerName serviceType technicianName companyName branchName paymentMethod completedAt finalizedAt createdAt updatedAt"
      )
      .sort({ finalizedAt: -1, createdAt: -1 })
      .limit(500);
  },

  async saveDraft(projectId: string, input: SaveServiceReportInput, scope: CallerScope) {
    const project = await projectService.getProjectById(projectId, scope);

    if (project.status !== ProjectStatus.IN_PROGRESS) {
      throw ApiError.badRequest("Service report can only be prepared while a job is in progress");
    }

    const existing = await ServiceReport.findOne({ projectId: project._id });
    if (existing?.status === ServiceReportStatus.FINALIZED) {
      throw ApiError.conflict("This service report is already finalized and cannot be edited");
    }

    const technicianId = project.assignedTechnicianId
      ? new mongoose.Types.ObjectId(String((project.assignedTechnicianId as any)._id ?? project.assignedTechnicianId))
      : undefined;

    const [technician, company, branch, snapshot, latestLocation] = await Promise.all([
      technicianId ? User.findById(technicianId).select("name phone") : null,
      project.companyId ? Company.findById(project.companyId).select("name") : null,
      project.branchId ? Branch.findById(project.branchId).select("name") : null,
      getSnapshotData(project._id),
      technicianId
        ? Location.findOne({
            technicianId,
            ...(project.companyId ? { companyId: project.companyId } : {}),
          })
            .sort({ recordedAt: -1 })
            .select("latitude longitude accuracy recordedAt")
            .lean()
        : null,
    ]);

    if (snapshot.beforePhotoIds.length === 0 || snapshot.afterPhotoIds.length === 0) {
      throw ApiError.badRequest("Before and after photos are required before saving the service report");
    }

    const signedAt = new Date();

    const proofDistanceFromSiteMeters =
      latestLocation && project.siteLocation &&
      typeof project.siteLocation.latitude === "number" &&
      typeof project.siteLocation.longitude === "number"
        ? Math.round(
            haversineDistanceKm(
              { latitude: project.siteLocation.latitude, longitude: project.siteLocation.longitude },
              { latitude: latestLocation.latitude, longitude: latestLocation.longitude },
            ) * 1000,
          )
        : undefined;

    if (input.nextServiceDate) {
      const next = new Date(input.nextServiceDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (next.getTime() < today.getTime()) {
        throw ApiError.badRequest("Recommended next service date cannot be in the past");
      }
    }

    const update = {
      companyId: project.companyId,
      branchId: project.branchId,
      projectId: project._id,
      projectCode: project.projectCode,
      customerName: project.customerName,
      customerPhone: project.customerPhone,
      address: project.address,
      serviceType: project.serviceType,
      technicianId,
      technicianName: technician?.name ?? "Assigned technician",
      technicianPhone: technician?.phone,
      companyName: company?.name,
      branchName: branch?.name,
      treatmentSummary: input.treatmentSummary.trim(),
      observations: normalizeOptional(input.observations),
      recommendations: normalizeOptional(input.recommendations),
      nextServiceDate: input.nextServiceDate ? new Date(input.nextServiceDate) : undefined,
      customerSignedBy: input.customerSignedBy.trim(),
      customerSignatureDataUrl: input.customerSignatureDataUrl,
      customerSignedAt: signedAt,
      beforePhotoIds: snapshot.beforePhotoIds,
      afterPhotoIds: snapshot.afterPhotoIds,
      chemicalUsage: snapshot.chemicalUsage,
      proofLatitude: latestLocation?.latitude,
      proofLongitude: latestLocation?.longitude,
      proofAccuracy: latestLocation?.accuracy,
      proofRecordedAt: latestLocation?.recordedAt,
      proofDistanceFromSiteMeters,
    };

    const report = existing
      ? await ServiceReport.findByIdAndUpdate(existing._id, { $set: update }, { new: true, runValidators: true })
      : await ServiceReport.create({
          ...update,
          reportNumber: createReportNumber(),
          verificationCode: createVerificationCode(),
          status: ServiceReportStatus.DRAFT,
          createdBy: new mongoose.Types.ObjectId(scope.userId),
        });

    if (!report) throw ApiError.internal("Could not save service report");
    return hydrateReport(report, projectId);
  },

  async getByProject(projectId: string, scope: CallerScope) {
    await projectService.getProjectById(projectId, scope);
    const report = await ServiceReport.findOne({ projectId });
    if (!report) throw ApiError.notFound("Service report has not been created yet");
    return hydrateReport(report, projectId);
  },

  async verify(code: string) {
    const normalized = code.trim().toUpperCase();
    const report = await ServiceReport.findOne({
      verificationCode: normalized,
      status: ServiceReportStatus.FINALIZED,
    }).select("reportNumber verificationCode projectCode serviceType technicianName companyName branchName completedAt finalizedAt createdAt proofLatitude proofLongitude proofAccuracy proofRecordedAt proofDistanceFromSiteMeters");

    if (!report) throw ApiError.notFound("No finalized Pest Mantra service report matches this verification code");

    return {
      verified: true,
      reportNumber: report.reportNumber,
      verificationCode: report.verificationCode,
      projectCode: report.projectCode,
      serviceType: report.serviceType,
      technicianName: report.technicianName,
      companyName: report.companyName,
      branchName: report.branchName,
      completedAt: report.completedAt,
      finalizedAt: report.finalizedAt,
      gpsVerified: typeof report.proofLatitude === "number" && typeof report.proofLongitude === "number",
      proofAccuracy: report.proofAccuracy,
      proofRecordedAt: report.proofRecordedAt,
      proofDistanceFromSiteMeters: report.proofDistanceFromSiteMeters,
      siteProximityVerified: typeof report.proofDistanceFromSiteMeters === "number" ? report.proofDistanceFromSiteMeters <= 250 : undefined,
    };
  },
};
