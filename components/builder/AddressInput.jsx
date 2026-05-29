"use client";

import { formatAddressLine } from "../../lib/builder-address";
import { US_STATES } from "../../lib/us-states";
import { FormField, inputClassName } from "./FormField";

export default function AddressInput({
  address,
  onChange,
  showValidation = false,
  errors = {},
}) {
  const update = (patch) => onChange({ ...address, ...patch });

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
    <div className="space-y-4 rounded-xl border border-white/10 bg-[#111111] p-4">
      <p className="text-sm font-medium text-[#D4AF37]">Business address</p>

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
          onChange={(e) => update({ street: e.target.value })}
          placeholder="123 Main Street"
          autoComplete="street-address"
          className={inputClassName(showValidation, errors.addressStreet, streetValid)}
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
            onChange={(e) => update({ city: e.target.value.replace(/[^a-zA-Z\s-]/g, "") })}
            placeholder="Pittsburgh"
            autoComplete="address-level2"
            className={inputClassName(showValidation, errors.addressCity, cityValid)}
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
            onChange={(e) => update({ state: e.target.value })}
            autoComplete="address-level1"
            className={`${inputClassName(showValidation, errors.addressState, stateValid)} appearance-none`}
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
          onChange={(e) => update({ zip: e.target.value.replace(/\D/g, "").slice(0, 5) })}
          placeholder="15201"
          autoComplete="postal-code"
          className={`max-w-[140px] ${inputClassName(showValidation, errors.addressZip, zipValid)}`}
        />
      </FormField>

      {showPreview && (
        <div className="rounded-xl border border-[#D4AF37]/25 bg-[#0A0A0A] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#a3a3a3]">
            Formatted address
          </p>
          <p className="mt-1 text-sm font-medium text-[#F0D060]">{formatted}</p>
        </div>
      )}
    </div>
  );
}
