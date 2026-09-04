"use client";

import { ui } from "@/lib/ui-classes";
import { TechnicianListItem } from "@/types/project";

export type DutyFilter =
  TechnicianListItem["dutyStatus"] | "all";

export type ActiveFilter =
  | "all"
  | "active"
  | "inactive";

export type SortFilter =
  | "name"
  | "employee"
  | "status";

interface TechnicianFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;

  dutyFilter: DutyFilter;
  onDutyFilterChange: (
    value: DutyFilter
  ) => void;

  activeFilter: ActiveFilter;
  onActiveFilterChange: (
    value: ActiveFilter
  ) => void;

  sortBy: SortFilter;
  onSortByChange: (
    value: SortFilter
  ) => void;

  onClear: () => void;
}

export function TechnicianFilters({
  search,
  onSearchChange,
  dutyFilter,
  onDutyFilterChange,
  activeFilter,
  onActiveFilterChange,
  sortBy,
  onSortByChange,
  onClear,
}: TechnicianFiltersProps) {
  return (
    <div className="mb-5 rounded-2xl border border-border-default bg-surface p-4 shadow-[0_8px_24px_rgba(15,23,42,0.035)]">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end">

        {/* SEARCH */}
        <div className="min-w-0 flex-1">
          <label
            htmlFor="technician-search"
            className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-ink-faint"
          >
            Search Technicians
          </label>

          <div className="relative">
            <span
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-faint"
              aria-hidden="true"
            >
              ⌕
            </span>

            <input
              id="technician-search"
              type="text"
              value={search}
              onChange={(e) =>
                onSearchChange(e.target.value)
              }
              placeholder="Search by name, phone or employee code..."
              className={`${ui.input} h-10 w-full bg-surface pl-9 text-sm`}
            />
          </div>
        </div>

        {/* DUTY STATUS */}
        <div className="w-full xl:w-44">
          <label
            htmlFor="technician-duty"
            className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-ink-faint"
          >
            Duty Status
          </label>

          <select
            id="technician-duty"
            value={dutyFilter}
            onChange={(e) =>
              onDutyFilterChange(
                e.target.value as DutyFilter
              )
            }
            className={`${ui.input} h-10 w-full bg-surface text-sm`}
          >
            <option value="all">
              All Duty Status
            </option>

            <option value="on_duty_idle">
              On Duty
            </option>

            <option value="busy">
              Busy
            </option>

            <option value="en_route">
              En Route
            </option>

            <option value="on_site">
              On Site
            </option>

            <option value="off_duty">
              Off Duty
            </option>
          </select>
        </div>

        {/* ACCOUNT STATUS */}
        <div className="w-full xl:w-40">
          <label
            htmlFor="technician-status"
            className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-ink-faint"
          >
            Status
          </label>

          <select
            id="technician-status"
            value={activeFilter}
            onChange={(e) =>
              onActiveFilterChange(
                e.target.value as ActiveFilter
              )
            }
            className={`${ui.input} h-10 w-full bg-surface text-sm`}
          >
            <option value="all">
              All Status
            </option>

            <option value="active">
              Active
            </option>

            <option value="inactive">
              Inactive
            </option>
          </select>
        </div>

        {/* SORT */}
        <div className="w-full xl:w-40">
          <label
            htmlFor="technician-sort"
            className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-ink-faint"
          >
            Sort By
          </label>

          <select
            id="technician-sort"
            value={sortBy}
            onChange={(e) =>
              onSortByChange(
                e.target.value as SortFilter
              )
            }
            className={`${ui.input} h-10 w-full bg-surface text-sm`}
          >
            <option value="name">
              Name
            </option>

            <option value="employee">
              Employee Code
            </option>

            <option value="status">
              Duty Status
            </option>
          </select>
        </div>

        {/* CLEAR */}
        <button
          type="button"
          onClick={onClear}
          className="h-10 rounded-lg border border-border-default bg-surface px-4 text-sm font-medium text-ink-muted transition hover:border-border-strong hover:bg-surface-2 hover:text-ink"
        >
          Clear
        </button>
      </div>

      {/* ACTIVE FILTER INDICATOR */}
      {(search ||
        dutyFilter !== "all" ||
        activeFilter !== "all" ||
        sortBy !== "name") && (
        <div className="mt-3 flex items-center gap-2 border-t border-border-default pt-3">
          <span className="text-[11px] text-ink-faint">
            Filters applied
          </span>

          {search && (
            <span className="rounded-md bg-accent/10 px-2 py-1 text-[10px] font-medium text-accent">
              Search
            </span>
          )}

          {dutyFilter !== "all" && (
            <span className="rounded-md bg-warning/10 px-2 py-1 text-[10px] font-medium text-warning">
              Duty
            </span>
          )}

          {activeFilter !== "all" && (
            <span className="rounded-md bg-accent-soft px-2 py-1 text-[10px] font-medium text-accent-strong">
              Status
            </span>
          )}
        </div>
      )}
    </div>
  );
}