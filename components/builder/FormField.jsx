"use client";

function CheckIcon() {
  return (
    <span
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500/20 text-green-400"
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
      className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3"
      role="alert"
    >
      <p className="text-sm font-semibold text-red-300">Please fix the following:</p>
      <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-red-200/90">
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
}) {
  const showError = showValidation && error;
  const showValid = showValidation && isValid && !error;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <label htmlFor={htmlFor} className="text-sm font-medium text-[#a3a3a3]">
          {label}
        </label>
        <div className="flex items-center gap-2">
          {counter}
          {showValid && <CheckIcon />}
        </div>
      </div>
      {children}
      {hint && !showError && <p className="mt-1.5 text-xs text-[#a3a3a3]">{hint}</p>}
      {showError && (
        <p className="mt-1.5 text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function inputClassName(showValidation, error, isValid) {
  const base =
    "w-full rounded-xl border bg-[#111111] px-4 py-3 text-sm text-white outline-none transition focus:ring-2";
  if (showValidation && error) {
    return `${base} border-red-500 focus:border-red-500 focus:ring-red-500/20`;
  }
  if (showValidation && isValid) {
    return `${base} border-green-500/60 focus:border-green-500/60 focus:ring-green-500/20`;
  }
  return `${base} border-white/10 focus:border-[#D4AF37]/50 focus:ring-[#D4AF37]/20`;
}
