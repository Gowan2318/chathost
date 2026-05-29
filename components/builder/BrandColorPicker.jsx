"use client";

import { BRAND_COLOR_PRESETS } from "../../lib/builder-colors";

function BubblePreview({ color }) {
  return (
    <div className="mt-2 space-y-1.5 rounded-lg bg-[#0A0A0A] p-2">
      <div
        className="ml-auto max-w-[85%] rounded-xl rounded-br-sm px-2 py-1 text-[9px] font-medium text-white"
        style={{ backgroundColor: color }}
      >
        Hi there!
      </div>
      <div className="max-w-[85%] rounded-xl rounded-bl-sm border border-white/10 bg-white px-2 py-1 text-[9px] text-slate-600">
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
        <label className="text-sm font-medium text-[#a3a3a3]">Brand color</label>
        {showValidation && isValid && !error && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/20 text-sm text-green-400">
            ✓
          </span>
        )}
      </div>
      {showValidation && error && (
        <p className="mb-3 text-sm text-red-400" role="alert">
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
              className={`rounded-xl border p-3 text-left transition ${
                selected
                  ? "border-[#D4AF37] ring-2 ring-[#D4AF37]/40"
                  : "border-white/10 hover:border-[#D4AF37]/30"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-6 w-6 shrink-0 rounded-full border border-white/20"
                  style={{ backgroundColor: preset.hex }}
                />
                <span className="text-xs font-medium text-white">{preset.name}</span>
              </div>
              <BubblePreview color={preset.hex} />
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-white/10 bg-[#111111] p-4">
        <label className="text-sm font-medium text-[#a3a3a3]">Custom color</label>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded-lg border border-white/10 bg-transparent"
          aria-label="Custom brand color"
        />
        <span className="font-mono text-sm text-[#F0D060]">{value}</span>
        {!isPreset && (
          <div className="w-full sm:w-auto sm:min-w-[140px]">
            <BubblePreview color={value} />
          </div>
        )}
      </div>
    </div>
  );
}
