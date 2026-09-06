"use client";

import { changeUserRole } from "./actions";

type Props = {
  userId: number;
  currentRole: string;
  disabled?: boolean;
};

const ROLES: Array<{ value: string; label: string }> = [
  { value: "ceo", label: "CEO / Owner" },
  { value: "sales", label: "Sales" },
  { value: "producer", label: "Producer" },
  { value: "coordinator", label: "Coordinator" },
  { value: "finance", label: "Finance" },
];

export function RoleSelect({ userId, currentRole, disabled }: Props) {
  return (
    <form action={changeUserRole} className="inline">
      <input type="hidden" name="id" value={userId} />
      <select
        name="role"
        defaultValue={currentRole}
        disabled={disabled}
        className="rounded border px-2 py-1"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
    </form>
  );
}
