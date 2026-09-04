import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ACCESS_COOKIE_NAME } from "@/lib/session";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { Invoice } from "@/types/invoice";
import InvoiceDetail from "@/components/InvoiceDetail";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const t = (await cookies()).get(ACCESS_COOKIE_NAME)?.value; try { const invoice = (await backendFetch<{ invoice: Invoice }>(`/invoices/${id}`, { accessToken: t })).invoice; return <InvoiceDetail initial={invoice} />; } catch (e) { if (e instanceof BackendApiError && e.statusCode === 404) notFound(); throw e; } }
