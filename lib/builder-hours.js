export const WEEKDAYS = [
  { key: "monday", label: "Monday", short: "Mon" },
  { key: "tuesday", label: "Tuesday", short: "Tue" },
  { key: "wednesday", label: "Wednesday", short: "Wed" },
  { key: "thursday", label: "Thursday", short: "Thu" },
  { key: "friday", label: "Friday", short: "Fri" },
  { key: "saturday", label: "Saturday", short: "Sat" },
  { key: "sunday", label: "Sunday", short: "Sun" },
];

export const TIME_OPTIONS = (() => {
  const opts = [];
  for (let h = 0; h < 24; h += 1) {
    for (const m of [0, 30]) {
      const value = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      const ampm = h < 12 ? "AM" : "PM";
      const label = `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
      opts.push({ value, label });
    }
  }
  return opts;
})();

const closedDay = () => ({
  open: false,
  openTime: "09:00",
  closeTime: "17:00",
});

const openDay = (openTime = "09:00", closeTime = "17:00") => ({
  open: true,
  openTime,
  closeTime,
});

/** Mon–Fri 9AM–5PM, Sat–Sun closed */
export function createDefaultBusinessHours() {
  return {
    monday: openDay(),
    tuesday: openDay(),
    wednesday: openDay(),
    thursday: openDay(),
    friday: openDay(),
    saturday: closedDay(),
    sunday: closedDay(),
  };
}

export function formatTimeLabel(value) {
  const opt = TIME_OPTIONS.find((t) => t.value === value);
  return opt?.label ?? value;
}

export function formatBusinessHours(hours) {
  if (!hours) return "";

  const groups = [];
  let i = 0;

  while (i < WEEKDAYS.length) {
    const day = WEEKDAYS[i];
    const slot = hours[day.key];
    if (!slot?.open) {
      i += 1;
      continue;
    }

    const range = `${formatTimeLabel(slot.openTime)}–${formatTimeLabel(slot.closeTime)}`;
    let j = i + 1;
    while (j < WEEKDAYS.length) {
      const next = WEEKDAYS[j];
      const nextSlot = hours[next.key];
      if (
        !nextSlot?.open ||
        nextSlot.openTime !== slot.openTime ||
        nextSlot.closeTime !== slot.closeTime
      ) {
        break;
      }
      j += 1;
    }

    const dayLabel =
      j - i === 1
        ? day.short
        : `${WEEKDAYS[i].short}–${WEEKDAYS[j - 1].short}`;
    groups.push(`${dayLabel} ${range}`);
    i = j;
  }

  const closedDays = WEEKDAYS.filter((d) => !hours[d.key]?.open).map((d) => d.short);
  if (closedDays.length === WEEKDAYS.length) return "Closed daily";
  if (closedDays.length > 0 && closedDays.length <= 2) {
    groups.push(`${closedDays.join(", ")} closed`);
  }

  return groups.join(", ");
}
