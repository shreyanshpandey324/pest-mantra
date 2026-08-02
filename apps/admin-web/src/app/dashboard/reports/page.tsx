import { ComingSoonPage } from "@/components/ComingSoonPage";

export default function ReportsPage() {
  return (
    <ComingSoonPage
      title="Reports"
      description="General business reports (completion rate, technician performance, revenue) aren't backed by an API yet. The Mileage Report page already works against the documented /mileage/report endpoint — broader reporting can be added here once those endpoints exist."
    />
  );
}
