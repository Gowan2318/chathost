"use client";

import MascotCharacter from "../mascots/MascotCharacter";
import { INDUSTRIES } from "../../lib/industries";

export default function IndustrySelector({
  value,
  onChange,
  showValidation = false,
  error,
  isValid = false,
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-[#4A5568]">
          Industry — pick your mascot
        </label>
        {showValidation && isValid && !error && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/15 text-sm text-green-600">
            ✓
          </span>
        )}
      </div>
      <div
        className={`grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-xl p-1 ${
          showValidation && error ? "ring-2 ring-red-400/50" : ""
        }`}
      >
        {INDUSTRIES.map((ind) => {
          const selected = value === ind.id;
          return (
            <button
              key={ind.id}
              type="button"
              onClick={() => onChange({ industry: ind.id, quickReplies: [] })}
              className={`relative flex flex-col items-center gap-3 rounded-2xl border p-4 text-center transition ${
                selected
                  ? "border-[#0D7377] bg-gradient-to-b from-[#E8F4F4] to-white shadow-lg shadow-[#0D7377]/15 ring-2 ring-[#0D7377]"
                  : "border-[#E2E8F0] bg-white hover:border-[#0D7377]/50 hover:bg-[#F8F9FA]"
              }`}
            >
              {selected && (
                <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#0D7377] text-[10px] font-bold text-white">
                  ✓
                </span>
              )}
              <div
                className={`rounded-2xl p-2 ${selected ? "bg-[#0D7377]/10" : "bg-[#F8F9FA]"}`}
              >
                <MascotCharacter industry={ind.id} size={52} />
              </div>
              <span
                className={`text-xs font-semibold leading-tight ${
                  selected ? "text-[#0D7377]" : "text-[#4A5568]"
                }`}
              >
                {ind.label}
              </span>
            </button>
          );
        })}
      </div>
      {showValidation && error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
