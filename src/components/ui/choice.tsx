"use client";

import { cn } from "@/lib/utils";

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

/** Large tappable option buttons — used instead of dropdowns wherever a question has few answers (§6.1). */
export function ChoiceGroup<T extends string>({
  name,
  value,
  options,
  onChange,
  columns = 1,
  disabled,
}: {
  name: string;
  value: T | null | undefined;
  options: ChoiceOption<T>[];
  onChange: (v: T) => void;
  columns?: 1 | 2 | 3;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={name} className={cn("grid gap-2", columns === 2 && "grid-cols-2", columns === 3 && "grid-cols-3")}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              "min-h-12 rounded-xl border px-4 py-3 text-left text-[15px] transition-colors",
              active ? "border-ink-900 bg-ink-900 text-white" : "border-ink-300 bg-white text-ink-900 hover:border-ink-500",
              disabled && "opacity-60",
            )}
          >
            <span className="block font-medium">{o.label}</span>
            {o.hint && <span className={cn("mt-0.5 block text-xs", active ? "text-white/80" : "text-ink-500")}>{o.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Yes / No / Not sure segmented row (§6.1 Screen 2). */
export function YesNoUnsureRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: "yes" | "no" | "unsure" | null | undefined;
  onChange: (v: "yes" | "no" | "unsure") => void;
}) {
  const opts: { v: "yes" | "no" | "unsure"; l: string }[] = [
    { v: "yes", l: "Yes" },
    { v: "no", l: "No" },
    { v: "unsure", l: "Not sure" },
  ];
  return (
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-[15px] font-medium">{label}</span>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-3 gap-1 rounded-xl bg-ink-100 p-1">
        {opts.map((o) => {
          const active = value === o.v;
          return (
            <button
              key={o.v}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.v)}
              className={cn(
                "h-11 rounded-lg px-3 text-sm font-medium transition-colors",
                active ? "bg-white text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-900",
              )}
            >
              {o.l}
            </button>
          );
        })}
      </div>
    </div>
  );
}
