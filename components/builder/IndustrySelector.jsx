"use client";

import MascotCharacter from "../mascots/MascotCharacter";
import { INDUSTRIES } from "../../lib/industries";
import { getIndustryQuickReplySuggestions } from "../../lib/builder-quick-replies";

export default function IndustrySelector({
  value,
  onChange,
  customQACount = 0,
  showValidation = false,
  error,
  isValid = false,
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-[#a3a3a3]">
          Industry — pick your mascot
        </label>
        {showValidation && isValid && !error && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/20 text-sm text-green-400">
            ✓
          </span>
        )}
      </div>
      <div
        className={`grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-xl p-1 ${
          showValidation && error ? "ring-2 ring-red-500/50" : ""
        }`}
      >
        {INDUSTRIES.map((ind) => {
          const selected = value === ind.id;
          return (
            <button
              key={ind.id}
              type="button"
              onClick={() =>
                onChange({
                  industry: ind.id,
                  quickReplies: getIndustryQuickReplySuggestions(ind.id).slice(
                    0,
                    Math.max(0, 8 - customQACount)
                  ),
                })
              }
              className={`relative flex flex-col items-center gap-3 rounded-2xl border p-4 text-center transition ${
                selected
                  ? "border-[#D4AF37] bg-gradient-to-b from-[#D4AF37]/20 to-[#1A1A1A] shadow-lg shadow-[#D4AF37]/15 ring-2 ring-[#D4AF37]"
                  : "border-white/10 bg-[#111111] hover:border-[#D4AF37]/50 hover:bg-[#1A1A1A]"
              }`}
            >
              {selected && (
                <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#D4AF37] text-[10px] font-bold text-[#0A0A0A]">
                  ✓
                </span>
              )}
              <div
                className={`rounded-2xl p-2 ${selected ? "bg-[#D4AF37]/10" : "bg-[#0A0A0A]"}`}
              >
                <MascotCharacter industry={ind.id} size={52} />
              </div>
              <span
                className={`text-xs font-semibold leading-tight ${
                  selected ? "text-[#F0D060]" : "text-[#a3a3a3]"
                }`}
              >
                {ind.label}
              </span>
            </button>
          );
        })}
      </div>
      {showValidation && error && (
        <p className="mt-2 text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
