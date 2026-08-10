"use client";

import { TechnicianListItem } from "@/types/project";
import { ui } from "@/lib/ui-classes";

interface TechnicianStatsProps {
  technicians: TechnicianListItem[];
}

export function TechnicianStats({
  technicians,
}: TechnicianStatsProps) {
  const total = technicians.length;


  const busy = technicians.filter(
    (t) =>
      t.dutyStatus === "busy" ||
      t.dutyStatus === "en_route" ||
      t.dutyStatus === "on_site"
  ).length;

  const offDuty = technicians.filter(
    (t) => t.dutyStatus === "off_duty"
  ).length;

  const active = technicians.filter(
    (t) => t.isActive
  ).length;

  const cards = [
    {
      title: "Total",
      value: total,
      subtitle: "Technicians",
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      title: "Active",
      value: active,
      subtitle: "Working Staff",
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      title: "Busy",
      value: busy,
      subtitle: "Assigned",
      color: "text-warning",
      bg: "bg-warning/10",
    },
    {
      title: "Off Duty",
      value: offDuty,
      subtitle: "Unavailable",
      color: "text-danger",
      bg: "bg-danger/10",
    },
  ];

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className={`${ui.card} p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-ink-muted">
                {card.title}
              </p>

              <h2
                className={`mt-2 text-4xl font-bold ${card.color}`}
              >
                {card.value}
              </h2>

              <p className="mt-1 text-xs text-ink-faint">
                {card.subtitle}
              </p>
            </div>

            <div
              className={`flex h-14 w-14 items-center justify-center rounded-2xl ${card.bg}`}
            >
              <div className="h-6 w-6 rounded-full bg-white/70" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}