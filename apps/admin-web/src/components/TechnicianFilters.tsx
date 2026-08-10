"use client";

import { ui } from "@/lib/ui-classes";
import { TechnicianListItem } from "@/types/project";

export type DutyFilter = TechnicianListItem["dutyStatus"] | "all";
export type ActiveFilter = "all" | "active" | "inactive";
export type SortFilter = "name" | "employee" | "status";

interface TechnicianFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;

  dutyFilter: DutyFilter;
  onDutyFilterChange: (value: DutyFilter) => void;

  activeFilter: ActiveFilter;
  onActiveFilterChange: (value: ActiveFilter) => void;

  sortBy: SortFilter;
  onSortByChange: (value: SortFilter) => void;

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
    <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-border-default bg-surface p-4 lg:flex-row lg:items-end">
      <div className="flex-1">
        <label className={ui.label}>Search</label>
        <input
          className={ui.input}
          placeholder="Search by name, phone or employee code..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="w-full lg:w-52">
        <label className={ui.label}>Duty Status</label>
        <select
          className={ui.input}
          value={dutyFilter}
          onChange={(e) =>
            onDutyFilterChange(e.target.value as DutyFilter)
          }
        >
          <option value="all">All</option>
          <option value="on_duty_idle">On Duty</option>
          <option value="busy">Busy</option>
          <option value="en_route">En Route</option>
          <option value="on_site">On Site</option>
          <option value="off_duty">Off Duty</option>
        </select>
      </div>

      <div className="w-full lg:w-44">
        <label className={ui.label}>Status</label>
        <select
          className={ui.input}
          value={activeFilter}
          onChange={(e) =>
            onActiveFilterChange(e.target.value as ActiveFilter)
          }
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="w-full lg:w-44">
        <label className={ui.label}>Sort</label>
        <select
          className={ui.input}
          value={sortBy}
          onChange={(e) =>
            onSortByChange(e.target.value as SortFilter)
          }
        >
          <option value="name">Name</option>
          <option value="employee">Employee Code</option>
          <option value="status">Duty Status</option>
        </select>
      </div>

      <button
        type="button"
        className={ui.btnGhost}
        onClick={onClear}
      >
        Clear
      </button>
    </div>
  );
}