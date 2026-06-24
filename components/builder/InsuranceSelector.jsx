"use client";

import { useState } from "react";

const PRESET_PLANS = [
  "Delta Dental",
  "Cigna",
  "MetLife",
  "Aetna",
  "Guardian",
  "United Concordia",
  "Humana",
  "BlueCross BlueShield",
  "Sun Life",
  "Principal",
  "Ameritas",
  "Renaissance",
  "Careington",
  "Assurant",
  "DentaQuest",
  "Medicaid",
  "Medicare Advantage",
  "No insurance accepted",
  "We accept most major plans",
  "Private pay only",
];

export default function InsuranceSelector({ value = [], onChange }) {
  const [customInput, setCustomInput] = useState("");

  const selected = Array.isArray(value) ? value : [];

  function toggle(plan) {
    if (selected.includes(plan)) {
      onChange(selected.filter((p) => p !== plan));
    } else if (selected.length < 20) {
      onChange([...selected, plan]);
    }
  }

  function addCustom() {
    const trimmed = customInput.trim();
    if (trimmed && !selected.includes(trimmed) && selected.length < 20) {
      onChange([...selected, trimmed]);
      setCustomInput("");
    }
  }

  return (
    <div>
      <p className="text-sm font-medium text-[#1A1A2E]">Insurance plans accepted</p>
      <p className="mt-0.5 text-xs text-[#4A5568]">
        Select all that apply — customers will be told exactly which plans you accept
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {PRESET_PLANS.map((plan) => {
          const isSelected = selected.includes(plan);
          return (
            <button
              key={plan}
              type="button"
              onClick={() => toggle(plan)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                isSelected
                  ? "border-[#0D7377] bg-[#0D7377] text-white"
                  : "border-[#CBD5E0] bg-white text-[#4A5568] hover:border-[#0D7377]/50 hover:text-[#0D7377]"
              }`}
            >
              {plan}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
          placeholder="Other plans not listed"
          className="flex-1 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1A1A2E] placeholder-[#9CA3AF] outline-none transition focus:border-[#0D7377]/50 focus:ring-2 focus:ring-[#0D7377]/20"
        />
        <button
          type="button"
          onClick={addCustom}
          className="rounded-xl border border-[#0D7377] px-3 py-2 text-xs font-medium text-[#0D7377] transition hover:bg-[#E8F4F4]"
        >
          Add
        </button>
      </div>

      <p className="mt-2 text-xs text-[#4A5568]">
        {selected.length === 0
          ? "None selected yet"
          : `Selected: ${selected.join(", ")}`}
      </p>
    </div>
  );
}
