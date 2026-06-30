"use client";

import { formatAddressLine } from "../../lib/builder-address";
import { US_STATES } from "../../lib/us-states";
import { FormField, inputClassName } from "./FormField";
import FieldTooltip from "./FieldTooltip";

function inputClassNameAF(showValidation, error, isValid, af) {
  const base = "w-full rounded-xl border bg-white px-4 py-3 text-sm text-[#1A1A2E] outline-none transition placeholder-[#9CA3AF] focus:ring-2";
  if (showValidation && error) return `${base} border-red-400 focus:border-red-400 focus:ring-red-400/20`;
  if (showValidation && isValid) return `${base} border-green-500/60 focus:border-green-500/60 focus:ring-green-500/20`;
  if (af) return `${base} border-green-400 ring-2 ring-green-100 focus:border-green-400 focus:ring-green-200`;
  return `${base} border-[#CBD5E0] focus:border-[#0D7377]/50 focus:ring-[#0D7377]/20`;
}

export default function AddressInput({
  address,
  onChange,
  onFieldChange,
  showValidation = false,
  errors = {},
  autoFilled,
  tooltip,
}) {
  const update = (patch, field) => {
    onChange({ ...address, ...patch });
    onFieldChange?.(field);
  };

  const streetValid =
    showValidation && !errors.addressStreet && address.street?.trim().length >= 10;
  const cityValid =
    showValidation && !errors.addressCity && /^[a-zA-Z\s-]{2,}$/.test(address.city?.trim() || "");
  const stateValid = showValidation && !errors.addressState && address.state;
  const zipValid =
    showValidation && !errors.addressZip && /^\d{5}$/.test(address.zip?.trim() || "");

  const formatted = formatAddressLine(address);
  const showPreview =
    formatted.length > 0 &&
    address.street?.trim() &&
    address.city?.trim() &&
    address.state &&
    address.zip?.trim();

  return (
    <div className="space-y-4 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] p-4">
      <p className="flex items-center gap-1.5 text-sm font-medium text-[#0D7377]">
        <span>Business address</span>
        {tooltip && <FieldTooltip text={tooltip} />}
      </p>

      <FormField
        label="Street address"
        htmlFor="address-street"
        showValidation={showValidation}
        error={errors.addressStreet}
        isValid={streetValid}
      >
        <input
          id="address-street"
          type="text"
          value={address.street}
          onChange={(e) => update({ street: e.target.value }, "addressStreet")}
          placeholder=""
          autoComplete="street-address"
          className={inputClassNameAF(showValidation, errors.addressStreet, streetValid, autoFilled?.has("addressStreet"))}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="City"
          htmlFor="address-city"
          showValidation={showValidation}
          error={errors.addressCity}
          isValid={cityValid}
        >
          <input
            id="address-city"
            type="text"
            value={address.city}
            onChange={(e) => update({ city: e.target.value.replace(/[^a-zA-Z\s-]/g, "") }, "addressCity")}
            placeholder=""
            autoComplete="address-level2"
            className={inputClassNameAF(showValidation, errors.addressCity, cityValid, autoFilled?.has("addressCity"))}
          />
        </FormField>

        <FormField
          label="State"
          htmlFor="address-state"
          showValidation={showValidation}
          error={errors.addressState}
          isValid={stateValid}
        >
          <select
            id="address-state"
            value={address.state}
            onChange={(e) => update({ state: e.target.value }, "addressState")}
            autoComplete="address-level1"
            className={`${inputClassNameAF(showValidation, errors.addressState, stateValid, autoFilled?.has("addressState"))} appearance-none`}
          >
            <option value="">Select state…</option>
            {US_STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField
        label="ZIP code"
        htmlFor="address-zip"
        showValidation={showValidation}
        error={errors.addressZip}
        isValid={zipValid}
      >
        <input
          id="address-zip"
          type="text"
          inputMode="numeric"
          maxLength={5}
          value={address.zip}
          onChange={(e) => update({ zip: e.target.value.replace(/\D/g, "").slice(0, 5) }, "addressZip")}
          placeholder=""
          autoComplete="postal-code"
          className={`max-w-[140px] ${inputClassNameAF(showValidation, errors.addressZip, zipValid, autoFilled?.has("addressZip"))}`}
        />
      </FormField>

      {showPreview && (
        <div className="rounded-xl border border-[#0D7377]/25 bg-[#E8F4F4] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#4A5568]">
            Formatted address
          </p>
          <p className="mt-1 text-sm font-medium text-[#0D7377]">{formatted}</p>
        </div>
      )}
    </div>
  );
}
