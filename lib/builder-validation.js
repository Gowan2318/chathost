import { INDUSTRIES } from "./industries";
import { BRAND_COLOR_PRESETS } from "./builder-colors";
import { US_STATE_CODES } from "./us-states";

const INDUSTRY_IDS = new Set(INDUSTRIES.map((i) => i.id));

const VALID_TLDS = new Set([
  "com",
  "net",
  "org",
  "io",
  "co",
  "us",
  "biz",
  "info",
  "dev",
  "app",
  "store",
  "shop",
  "online",
  "site",
  "me",
  "ai",
  "edu",
  "gov",
  "uk",
  "ca",
  "au",
]);

const PHONE_ERROR = "Please enter a valid business phone number";
const EMAIL_ERROR = "Please enter a valid business email address";
const WEBSITE_URL_ERROR =
  "Please enter a valid website URL (e.g. https://yourbusiness.com)";
const PAYMENT_URL_ERROR =
  "Please enter a valid website URL (e.g. https://yourbusiness.com)";
const BUSINESS_DESC_ERROR =
  "Please describe your business in detail (at least 5 different words)";
const SERVICES_ERROR =
  "Please list your services with at least 3 different words";

export function digitsOnlyPhone(value) {
  return value.replace(/\D/g, "");
}

export function isTrivialPaste(text, minLen) {
  const t = text.trim();
  if (t.length < minLen) return true;
  if (/^(.)\1+$/u.test(t.replace(/\s/g, ""))) return true;
  return false;
}

/** @returns {string[]} */
function getSignificantWords(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && /[a-z]/.test(w));
}

function countUniqueWords(text) {
  return new Set(getSignificantWords(text)).size;
}

function isRepeatedOrGibberishText(text) {
  const words = getSignificantWords(text);
  if (words.length === 0) return true;

  const unique = new Set(words);
  if (unique.size === 1 && words.length >= 3) return true;

  const compact = text.replace(/\s/g, "");
  if (compact.length >= 8 && /^(.)\1+$/u.test(compact)) return true;

  const joined = words.join("");
  if (joined.length >= 10 && /^(.)\1+$/u.test(joined)) return true;

  return false;
}

function isFakePhoneNumber(digits) {
  if (digits.length !== 10) return true;
  if (/^0+$/.test(digits)) return true;
  if (/^(\d)\1{9}$/.test(digits)) return true;

  const sequences = ["0123456789", "1234567890", "9876543210", "0987654321"];
  if (sequences.includes(digits)) return true;

  if (/^0{10}$|^1{10}$/.test(digits)) return true;

  return false;
}

function isValidDomainHost(hostname) {
  const host = hostname.toLowerCase().replace(/^www\./, "");

  if (!host || host.includes(" ") || host.includes("..")) return false;
  if (host === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return false;

  const labels = host.split(".");
  if (labels.length < 2) return false;

  const tld = labels[labels.length - 1];
  if (!VALID_TLDS.has(tld) || tld.length < 2) return false;

  const sld = labels[labels.length - 2];
  if (!sld || sld.length < 3) return false;
  if (!/^[a-z0-9-]+$/i.test(sld) || sld.startsWith("-") || sld.endsWith("-")) {
    return false;
  }

  if (host.replace(/\./g, "").length < 4) return false;

  if (labels.some((label) => label.length === 0)) return false;
  if (labels.slice(0, -1).some((label) => label.length < 2)) return false;

  if (labels.every((label) => label.length === 1)) return false;

  return true;
}

function validateRealUrl(value, { required = false, httpsOnly = false, errorMessage }) {
  const t = value.trim();
  if (!t) return required ? errorMessage : null;

  if (httpsOnly && !t.startsWith("https://")) return errorMessage;
  if (!httpsOnly && !/^https?:\/\//i.test(t)) return errorMessage;

  let url;
  try {
    url = new URL(t);
  } catch {
    return errorMessage;
  }

  if (!["http:", "https:"].includes(url.protocol)) return errorMessage;
  if (httpsOnly && url.protocol !== "https:") return errorMessage;
  if (!url.hostname) return errorMessage;

  if (!isValidDomainHost(url.hostname)) return errorMessage;

  return null;
}

export function validateBusinessName(value) {
  const name = value.trim();
  if (!name) return "Business name is required.";
  if (name.length < 3) return "Business name must be at least 3 characters.";
  if (/^\d+$/.test(name)) return "Business name cannot be only numbers.";
  if (!/^[a-zA-Z0-9\s-]+$/.test(name)) {
    return "Use only letters, numbers, spaces, and hyphens.";
  }
  if (isTrivialPaste(name, 3)) return "Please enter a real business name.";
  return null;
}

export function validateIndustry(value) {
  if (!value || !INDUSTRY_IDS.has(value)) {
    return "Please select an industry.";
  }
  return null;
}

export function validateBusinessDescription(value) {
  const t = value.trim();
  if (!t) return "Business description is required.";
  if (t.length < 50) return "Business description must be at least 50 characters.";
  if (isRepeatedOrGibberishText(t)) return BUSINESS_DESC_ERROR;
  if (countUniqueWords(t) < 5) return BUSINESS_DESC_ERROR;
  return null;
}

export function validateServicesDescription(value) {
  const t = value.trim();
  if (!t) return "Services is required.";
  if (t.length < 20) return "Services must be at least 20 characters.";
  if (isRepeatedOrGibberishText(t)) return SERVICES_ERROR;
  if (countUniqueWords(t) < 3) return SERVICES_ERROR;
  return null;
}

export function validateMinText(value, min, label, options = {}) {
  const t = value.trim();
  if (!t) return `${label} is required.`;
  if (t.length < min) return `${label} must be at least ${min} characters.`;
  if (options.noTrivial && isTrivialPaste(t, min)) {
    return `Please enter a meaningful ${label.toLowerCase()}.`;
  }
  return null;
}

/** @returns {Record<string, string>} */
export function validateAddressFields(address = {}) {
  const errors = {};
  const street = address.street?.trim() || "";
  const city = address.city?.trim() || "";
  const state = address.state?.trim() || "";
  const zip = address.zip?.trim() || "";

  if (!street) {
    errors.addressStreet = "Street address is required.";
  } else if (!/^\d/.test(street)) {
    errors.addressStreet = "Street address must start with a street number.";
  } else if (street.length < 10) {
    errors.addressStreet = "Street address must be at least 10 characters.";
  }

  if (!city) {
    errors.addressCity = "City is required.";
  } else if (city.length < 2) {
    errors.addressCity = "City must be at least 2 characters.";
  } else if (!/^[a-zA-Z\s-]+$/.test(city)) {
    errors.addressCity = "City can only contain letters.";
  }

  if (!state) {
    errors.addressState = "Please select a state.";
  } else if (!US_STATE_CODES.has(state)) {
    errors.addressState = "Please select a valid US state.";
  }

  if (!zip) {
    errors.addressZip = "ZIP code is required.";
  } else if (!/^\d{5}$/.test(zip)) {
    errors.addressZip = "ZIP code must be exactly 5 digits.";
  } else if (zip === "00000") {
    errors.addressZip = "Please enter a valid ZIP code.";
  }

  return errors;
}

export function isAddressFieldsValid(address) {
  return Object.keys(validateAddressFields(address)).length === 0;
}

export function validatePhone(value) {
  const t = value.trim();
  if (!t) return "Support phone is required.";

  if (!/^[\d\s().+-]+$/.test(t)) return PHONE_ERROR;

  const digits = digitsOnlyPhone(t);
  if (digits.length !== 10 || isFakePhoneNumber(digits)) {
    return PHONE_ERROR;
  }

  return null;
}

export function validateEmail(value) {
  const t = value.trim().toLowerCase();
  if (!t) return "Support email is required.";

  const atParts = t.split("@");
  if (atParts.length !== 2) return EMAIL_ERROR;

  const [local, domain] = atParts;
  if (local.length < 3) return EMAIL_ERROR;
  if (!/^[a-z0-9][a-z0-9._%+-]*[a-z0-9]$|^[a-z0-9]{3,}$/.test(local)) return EMAIL_ERROR;

  if (domain.length < 4) return EMAIL_ERROR;

  const domainLabels = domain.split(".");
  if (domainLabels.length < 2) return EMAIL_ERROR;

  const tld = domainLabels[domainLabels.length - 1];
  if (!VALID_TLDS.has(tld)) return EMAIL_ERROR;

  const domainName = domainLabels[domainLabels.length - 2];
  if (!domainName || domainName.length < 2) return EMAIL_ERROR;

  if (domainLabels.some((label) => label.length === 0)) return EMAIL_ERROR;
  if (domainLabels.slice(0, -1).some((label) => label.length < 2)) return EMAIL_ERROR;

  if (local.length + domain.length < 7) return EMAIL_ERROR;

  return null;
}

export function validateHttpsUrl(value, { required = false } = {}) {
  return validateRealUrl(value, {
    required,
    httpsOnly: true,
    errorMessage: PAYMENT_URL_ERROR,
  });
}

export function validateWebsiteUrl(value) {
  const t = value.trim();
  if (!t) return "Website URL is required.";
  return validateRealUrl(value, {
    required: true,
    httpsOnly: false,
    errorMessage: WEBSITE_URL_ERROR,
  });
}

export function validateBrandColor(value) {
  if (!value?.trim()) return "Please select a brand color.";
  const hex = value.trim();
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return "Please select a valid brand color.";
  return null;
}

export function validateQuickReplies(quickReplies) {
  const active = quickReplies.filter((r) => r?.trim());
  const fieldErrors = {};

  const seen = new Set();
  active.forEach((reply, index) => {
    const t = reply.trim();
    if (t.length < 5) {
      fieldErrors[`quickReply_${index}`] =
        "Each quick reply must be at least 5 characters.";
    }
    const key = t.toLowerCase();
    if (seen.has(key)) {
      fieldErrors[`quickReply_${index}`] =
        "Duplicate quick reply text is not allowed.";
    }
    seen.add(key);
  });

  return { fieldErrors };
}

export function validateMascotName(value) {
  const t = value.trim();
  if (!t) return "Mascot name is required.";
  if (t.length < 2) return "Mascot name must be at least 2 characters.";
  if (t.length > 20) return "Mascot name cannot exceed 20 characters.";
  if (!/^[a-zA-Z\s]+$/.test(t)) return "Mascot name can only contain letters and spaces.";
  if (isTrivialPaste(t, 2)) return "Please enter a real mascot name.";
  return null;
}

/** @returns {{ valid: boolean, errors: Record<string, string>, summary: string[] }} */
export function validateStep(step, form, { plan = "pro" } = {}) {
  const errors = {};
  const summary = [];

  const add = (key, message) => {
    if (!errors[key]) {
      errors[key] = message;
      summary.push(message);
    }
  };

  // Step 1: website import — always valid (import is optional)

  if (step === 2) {
    const nameErr = validateBusinessName(form.businessName);
    if (nameErr) add("businessName", nameErr);

    if (plan !== "basic") {
      const indErr = validateIndustry(form.industry);
      if (indErr) add("industry", indErr);
    }

    const descErr = validateBusinessDescription(form.businessDescription);
    if (descErr) add("businessDescription", descErr);

    const svcErr = validateServicesDescription(form.servicesDescription);
    if (svcErr) add("servicesDescription", svcErr);

    const addrErrors = validateAddressFields(form.address);
    Object.entries(addrErrors).forEach(([key, message]) => add(key, message));

    const phoneErr = validatePhone(form.supportPhone);
    if (phoneErr) add("supportPhone", phoneErr);

    const emailErr = validateEmail(form.supportEmail);
    if (emailErr) add("supportEmail", emailErr);

    const bookingErr = validateHttpsUrl(form.bookingUrl);
    if (bookingErr) add("bookingUrl", bookingErr);

    const payErr = validateHttpsUrl(form.payNowUrl);
    if (payErr) add("payNowUrl", payErr);
  }

  if (step === 3) {
    // Pro-only: Mascot & Branding (Basic users skip this step)
    const mascotErr = validateMascotName(form.mascotName);
    if (mascotErr) add("mascotName", mascotErr);

    const colorErr = validateBrandColor(form.brandColor);
    if (colorErr) add("brandColor", colorErr);
  }

  if (step === 4) {
    const qr = validateQuickReplies(form.quickReplies);
    Object.entries(qr.fieldErrors).forEach(([k, v]) => add(k, v));
  }

  if (step === 6) {
    const urlErr = validateWebsiteUrl(form.websiteUrl);
    if (urlErr) add("websiteUrl", urlErr);
  }

  const uniqueSummary = [...new Set(Object.values(errors))];

  return {
    valid: uniqueSummary.length === 0,
    errors,
    summary: uniqueSummary,
  };
}

export function isFieldValid(errors, key, value, validator) {
  if (errors[key]) return false;
  if (!value && value !== 0) return false;
  return validator ? validator(value) === null : true;
}

export { BRAND_COLOR_PRESETS };
