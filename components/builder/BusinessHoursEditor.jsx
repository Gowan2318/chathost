"use client";

import { TIME_OPTIONS, WEEKDAYS } from "../../lib/builder-hours";
import FieldTooltip from "./FieldTooltip";

export default function BusinessHoursEditor({ hours, onChange, tooltip }) {
  const updateDay = (key, patch) => {
    onChange({
      ...hours,
      [key]: { ...hours[key], ...patch },
    });
  };

  return (
    <div className="space-y-3">
      <p className="flex items-center gap-1.5 text-sm font-medium text-[#a3a3a3]">
        <span>Business hours</span>
        {tooltip && <FieldTooltip text={tooltip} />}
      </p>
      <div className="space-y-2 rounded-xl border border-white/10 bg-[#111111] p-3">
        {WEEKDAYS.map((day) => {
          const slot = hours[day.key];
          return (
            <div
              key={day.key}
              className="flex flex-col gap-2 border-b border-white/5 py-3 last:border-0 sm:flex-row sm:items-center sm:gap-3"
            >
              <label className="flex min-w-[120px] items-center gap-2 text-sm text-white">
                <input
                  type="checkbox"
                  checked={slot.open}
                  onChange={(e) => updateDay(day.key, { open: e.target.checked })}
                  className="h-4 w-4 rounded border-white/20 accent-[#D4AF37]"
                />
                {day.label}
              </label>
              {slot.open ? (
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  <select
                    value={slot.openTime}
                    onChange={(e) => updateDay(day.key, { openTime: e.target.value })}
                    className="flex-1 rounded-lg border border-white/10 bg-[#1A1A1A] px-3 py-2 text-sm text-white outline-none focus:border-[#D4AF37]/50"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={`open-${t.value}`} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-[#a3a3a3]">to</span>
                  <select
                    value={slot.closeTime}
                    onChange={(e) => updateDay(day.key, { closeTime: e.target.value })}
                    className="flex-1 rounded-lg border border-white/10 bg-[#1A1A1A] px-3 py-2 text-sm text-white outline-none focus:border-[#D4AF37]/50"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={`close-${t.value}`} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="text-sm text-[#a3a3a3]">Closed</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
