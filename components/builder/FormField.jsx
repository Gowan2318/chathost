"use client";

import FieldTooltip from "./FieldTooltip";

function CheckIcon() {
  return (
    <span
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500/15 text-green-600"
      aria-hidden
    >
      ✓
    </span>
  );
}

export function ErrorSummary({ summary, show }) {
  if (!show || !summary?.length) return null;
  return (
    <div
      className="mb-6 rounded-xl border border-red-500/30 bg-red-50 px-4 py-3"
      role="alert"
    >
      <p className="text-sm font-semibold text-red-700">Please fix the following:</p>
      <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-red-600">
        {summary.map((msg) => (
          <li key={msg}>{msg}</li>
        ))}
      </ul>
    </div>
  );
}

export function FormField({
  label,
  htmlFor,
  error,
  showValidation,
  isValid,
  children,
  hint,
  counter,
  tooltip,
}) {
  const showError = showValidation && error;
  const showValid = showValidation && isValid && !error;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <label htmlFor={htmlFor} className="flex items-center gap-1.5 text-sm font-medium text-[#4A5568]">
          <span>{label}</span>
          {tooltip && <FieldTooltip text={tooltip} />}
        </label>
        <div className="flex items-center gap-2">
          {counter}
          {showValid && <CheckIcon />}
        </div>
      </div>
      {children}
      {hint && !showError && <p className="mt-1.5 text-xs text-[#4A5568]">{hint}</p>}
      {showError && (
        <p className="mt-1.5 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function inputClassName(showValidation, error, isValid) {
  const base =
    "w-full rounded-xl border bg-white px-4 py-3 text-sm text-[#1A1A2E] outline-none transition placeholder-[#9CA3AF] focus:ring-2";
  if (showValidation && error) {
    return `${base} border-red-400 focus:border-red-400 focus:ring-red-400/20`;
  }
  if (showValidation && isValid) {
    return `${base} border-green-500/60 focus:border-green-500/60 focus:ring-green-500/20`;
  }
  return `${base} border-[#E2E8F0] focus:border-[#0D7377]/50 focus:ring-[#0D7377]/20`;
}
