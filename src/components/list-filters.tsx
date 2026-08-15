"use client";

import { Button, Input, Select } from "@/components/ui";

const STATUSES = [
  { value: "DRAFT", label: "Draft" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function ListFilters({
  q,
  status,
  from,
  to,
  showStatus = false,
  showDates = false,
  placeholder = "Search…",
  statuses = STATUSES,
}: {
  q?: string;
  status?: string;
  from?: string;
  to?: string;
  showStatus?: boolean;
  showDates?: boolean;
  placeholder?: string;
  statuses?: { value: string; label: string }[];
}) {
  return (
    <form method="get" className="mb-2 flex flex-wrap items-end gap-2 px-3 pt-3">
      <Input name="q" defaultValue={q} placeholder={placeholder} className="w-56" />
      {showStatus ? (
        <Select name="status" defaultValue={status ?? ""} className="w-40">
          <option value="">All statuses</option>
          {statuses.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      ) : null}
      {showDates ? (
        <>
          <Input type="date" name="from" defaultValue={from} className="w-40" />
          <Input type="date" name="to" defaultValue={to} className="w-40" />
        </>
      ) : null}
      <Button type="submit" variant="secondary">
        Filter
      </Button>
    </form>
  );
}
