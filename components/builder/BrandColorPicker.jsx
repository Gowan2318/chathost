"use client";

import { BRAND_COLOR_PRESETS } from "../../lib/builder-colors";

function BubblePreview({ color }) {
  return (
    <div className="mt-2 space-y-1.5 rounded-lg bg-[#F8F9FA] p-2">
      <div
        className="relative ml-auto max-w-[85%] overflow-hidden rounded-xl rounded-br-sm"
        style={{ backgroundColor: color }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <span
          className="relative block px-2 py-1 text-[9px] font-semibold text-white"
          style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
        >
          Hi there!
        </span>
      </div>
      <div className="max-w-[85%] rounded-xl rounded-bl-sm border border-[#E2E8F0] bg-white px-2 py-1 text-[9px] text-[#4A5568]">
        How can I help?
      </div>
    </div>
  );
}

export default function BrandColorPicker({
  value,
  onChange,
  showValidation = false,
  error,
  isValid = false,
}) {
  const isPreset = BRAND_COLOR_PRESETS.some((p) => p.hex.toLowerCase() === value.toLowerCase());

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-[#4A5568]">Brand color</label>
        {showValidation && isValid && !error && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/15 text-sm text-green-600">
            ✓
          </span>
        )}
      </div>
      {showValidation && error && (
        <p className="mb-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {BRAND_COLOR_PRESETS.map((preset) => {
          const selected = value.toLowerCase() === preset.hex.toLowerCase();
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onChange(preset.hex)}
              className={`rounded-xl border-2 p-3 text-left transition ${
                selected
                  ? "border-[#0D7377] ring-2 ring-[#0D7377]/40"
                  : "border-gray-200 bg-white hover:border-[#0D7377]/50"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-6 w-6 shrink-0 rounded-full border border-[#E2E8F0]"
                  style={{ backgroundColor: preset.hex }}
                />
                <span className="text-xs font-medium text-[#1A1A2E]">{preset.name}</span>
              </div>
              <BubblePreview color={preset.hex} />
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] p-4">
        <label className="text-sm font-medium text-[#4A5568]">Custom color</label>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded-lg border border-[#E2E8F0] bg-transparent"
          aria-label="Custom brand color"
        />
        <span className="font-mono text-sm font-semibold text-[#0D7377]">{value}</span>
        {!isPreset && (
          <div className="w-full sm:w-auto sm:min-w-[140px]">
            <BubblePreview color={value} />
          </div>
        )}
      </div>
    </div>
  );
}
