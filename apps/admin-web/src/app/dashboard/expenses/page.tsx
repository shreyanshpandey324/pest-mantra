import { cookies } from "next/headers";
import { ACCESS_COOKIE_NAME } from "@/lib/session";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { Expense, FinanceSummary } from "@/types/expense";
import { Project, TechnicianListItem } from "@/types/project";
import { ExpensesProfitClient } from "@/components/ExpensesProfitClient";

const emptySummary: FinanceSummary = { billedRevenue: 0, collectedRevenue: 0, outstanding: 0, recognizedCost: 0, paidExpenses: 0, pendingApproval: 0, estimatedProfit: 0, cashProfit: 0, estimatedMargin: 0, categoryBreakdown: [], serviceProfitability: [], branchProfitability: [], invoiceCount: 0, expenseCount: 0 };

export default async function ExpensesPage() {
  const token = (await cookies()).get(ACCESS_COOKIE_NAME)?.value;
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const from = `${first.getFullYear()}-${String(first.getMonth()+1).padStart(2,"0")}-01`;
  const to = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  const qs = `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  let expenses: Expense[] = []; let summary = emptySummary; let projects: Project[] = []; let technicians: TechnicianListItem[] = []; let error = "";
  try {
    const [expenseData, summaryData, projectData, techData] = await Promise.all([
      backendFetch<{ expenses: Expense[] }>(`/expenses?${qs}`, { accessToken: token }),
      backendFetch<{ summary: FinanceSummary }>(`/expenses/summary?${qs}`, { accessToken: token }),
      backendFetch<{ projects: Project[] }>("/projects", { accessToken: token }),
      backendFetch<{ technicians: TechnicianListItem[] }>("/technicians", { accessToken: token }),
    ]);
    expenses = expenseData.expenses; summary = summaryData.summary; projects = projectData.projects; technicians = techData.technicians;
  } catch (e) { error = e instanceof BackendApiError ? e.message : "Could not load the finance workspace"; }
  return <div className="space-y-6"><header><div className="mb-2 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-success shadow-[0_0_14px_rgba(61,220,132,.75)]"/><p className="font-mono text-xs uppercase tracking-[.2em] text-success">Finance intelligence</p></div><h1 className="text-3xl font-semibold tracking-tight">Expenses & Profit</h1><p className="mt-2 max-w-3xl text-sm text-ink-muted">Control operating costs, approve field expenses and see real invoice revenue against business spend.</p></header>{error ? <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}<ExpensesProfitClient initialExpenses={expenses} initialSummary={summary} projects={projects} technicians={technicians} initialFrom={from} initialTo={to} /></div>;
}
