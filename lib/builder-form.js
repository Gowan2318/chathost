import { formatAddressLine } from "./builder-address";
import { formatBusinessHours } from "./builder-hours";

/** Builds the AI context string from structured builder fields */
export function composeBusinessInfo(form) {
  const parts = [];

  if (form.businessDescription?.trim()) {
    parts.push(form.businessDescription.trim());
  }

  if (form.servicesDescription?.trim()) {
    parts.push(`Services: ${form.servicesDescription.trim()}`);
  }

  const hours = formatBusinessHours(form.businessHours);
  if (hours) parts.push(`Hours: ${hours}`);

  const address = formatAddressLine(form.address);
  if (address) parts.push(`Address: ${address}`);

  if (form.supportPhone?.trim()) {
    parts.push(`Phone: ${form.supportPhone.trim()}`);
  }
  if (form.supportEmail?.trim()) {
    parts.push(`Email: ${form.supportEmail.trim()}`);
  }

  const qaBlock = formatCustomQAForPrompt(form.customQA);
  if (qaBlock) parts.push(qaBlock);

  return parts.join(". ");
}

/** Injected into AI context so the bot answers custom Q&A accurately */
export function formatCustomQAForPrompt(customQA) {
  if (!Array.isArray(customQA) || customQA.length === 0) return "";

  const pairs = customQA
    .filter((item) => item?.question?.trim() && item?.answer?.trim())
    .map(
      (item) =>
        `Q: ${item.question.trim()}\nA: ${item.answer.trim()}`
    );

  if (pairs.length === 0) return "";

  return `Custom Q&A — when customers ask similar questions, answer exactly as written:\n${pairs.join("\n\n")}`;
}

export const MAX_KNOWLEDGE_SLOTS = 8;

export function countKnowledgeSlots(quickReplies, customQA) {
  const replies = Array.isArray(quickReplies) ? quickReplies.filter(Boolean).length : 0;
  const qa = Array.isArray(customQA) ? customQA.length : 0;
  return replies + qa;
}
