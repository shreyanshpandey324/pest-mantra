import { cookies } from "next/headers";
import { ComplaintsView } from "@/components/ComplaintsView";
import { ACCESS_COOKIE_NAME } from "@/lib/session";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { ComplaintListResponse } from "@/types/complaint";
import { Project } from "@/types/project";
import { LeadAssignee } from "@/types/lead";
import { getCurrentUser } from "@/lib/current-user";

export default async function ComplaintsPage() {
  const token=(await cookies()).get(ACCESS_COOKIE_NAME)?.value; const user=await getCurrentUser();
  const [complaintsResult,projectsResult,assigneesResult]=await Promise.allSettled([
    backendFetch<ComplaintListResponse>("/complaints?pageSize=100",{accessToken:token}),
    backendFetch<{projects:Project[]}>("/projects?pageSize=100",{accessToken:token}),
    backendFetch<{assignees:LeadAssignee[]}>("/leads/assignees",{accessToken:token}),
  ]);
  if(complaintsResult.status==="rejected"){const e=complaintsResult.reason;return <div className="rounded-2xl border border-danger/30 bg-danger/10 p-5 text-sm text-danger">{e instanceof BackendApiError?e.message:"Could not load complaints."}</div>}
  return <ComplaintsView initialComplaints={complaintsResult.value.complaints} initialMetrics={complaintsResult.value.metrics} projects={projectsResult.status==="fulfilled"?projectsResult.value.projects:[]} assignees={assigneesResult.status==="fulfilled"?assigneesResult.value.assignees:[]} role={user.role}/>;
}
