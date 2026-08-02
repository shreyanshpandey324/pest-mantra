import { cookies } from "next/headers";
import { ACCESS_COOKIE_NAME } from "@/lib/session";
import { backendFetch, BackendApiError } from "@/lib/backend-client";
import { Chemical, ChemicalCheckout } from "@/types/inventory";
import { InventoryBoard } from "@/components/InventoryBoard";

/**
 * Same split as the Dashboard Home / Live Board pattern: initial
 * data fetched server-side for a fast first paint, all interactions
 * (add chemical, issue, return) handled client-side afterward.
 */
export default async function InventoryPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  let chemicals: Chemical[] = [];
  let openCheckouts: ChemicalCheckout[] = [];
  let loadError: string | null = null;

  try {
    const [chemicalsData, checkoutsData] = await Promise.all([
      backendFetch<{ chemicals: Chemical[] }>("/chemicals", { accessToken }),
      backendFetch<{ checkouts: ChemicalCheckout[] }>("/chemicals/checkout/open", { accessToken }),
    ]);
    chemicals = chemicalsData.chemicals;
    openCheckouts = checkoutsData.checkouts;
  } catch (err) {
    loadError = err instanceof BackendApiError ? err.message : "Could not load inventory.";
  }

  return (
    <div>
      <h1 className="mb-5 text-[22px]">Inventory</h1>
      {loadError && (
        <div
          role="alert"
          className="mb-5 rounded-2xl border border-danger/40 bg-surface px-[18px] py-3.5 text-[13px] text-danger"
        >
          {loadError}
        </div>
      )}
      <InventoryBoard initialChemicals={chemicals} initialOpenCheckouts={openCheckouts} />
    </div>
  );
}
