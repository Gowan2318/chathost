"use client";

import { useState } from "react";
import { MAX_KNOWLEDGE_SLOTS, countKnowledgeSlots } from "../../lib/builder-form";
import { getFilteredSuggestions } from "../../lib/builder-quick-replies";
import { inputClassName } from "./FormField";

function newPairId() {
  return `qa-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function QuickRepliesEditor({
  industry,
  quickReplies,
  onChange,
  customQA = [],
  onCustomQAChange,
  showValidation = false,
  fieldErrors = {},
  formFields = {},
}) {
  const [custom, setCustom] = useState("");
  const [draftQuestion, setDraftQuestion] = useState("");
  const [draftAnswer, setDraftAnswer] = useState("");

  const suggestions = getFilteredSuggestions(industry, formFields);
  const active = quickReplies.filter(Boolean);
  const used = countKnowledgeSlots(active, customQA);
  const atLimit = used >= MAX_KNOWLEDGE_SLOTS;
  const remaining = MAX_KNOWLEDGE_SLOTS - used;

  const addReply = (text) => {
    const trimmed = text.trim();
    if (!trimmed || atLimit) return;
    if (active.some((r) => r.toLowerCase() === trimmed.toLowerCase())) return;
    onChange([...active, trimmed]);
  };

  const removeReply = (index) => {
    onChange(active.filter((_, i) => i !== index));
  };

  const updateReply = (index, value) => {
    const next = [...active];
    next[index] = value;
    onChange(next);
  };

  const handleAddCustomReply = () => {
    addReply(custom);
    setCustom("");
  };

  const handleAddQA = () => {
    const question = draftQuestion.trim();
    const answer = draftAnswer.trim();
    if (!question || !answer || atLimit) return;
    onCustomQAChange([
      ...customQA,
      { id: newPairId(), question, answer },
    ]);
    setDraftQuestion("");
    setDraftAnswer("");
  };

  const removeQA = (id) => {
    onCustomQAChange(customQA.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between rounded-xl border border-[#0D7377]/25 bg-[#0D7377]/5 px-4 py-3">
        <p className="text-sm text-[#4A5568]">
          Add up to 8 quick reply buttons — use as many or as few as you like
        </p>
        <span
          className={`rounded-full px-3 py-1 text-sm font-bold ${
            atLimit
              ? "bg-[#0D7377] text-white"
              : "bg-[#0D7377]/10 text-[#0D7377] ring-1 ring-[#0D7377]/40"
          }`}
        >
          {used}/{MAX_KNOWLEDGE_SLOTS} max
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-[#4A5568]">
            Suggested for {industry.replace("_", " ")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {suggestions.map((s) => {
              const isActive = active.some((r) => r.toLowerCase() === s.toLowerCase());
              return (
                <button
                  key={s}
                  type="button"
                  disabled={!isActive && atLimit}
                  onClick={() =>
                    isActive ? onChange(active.filter((r) => r !== s)) : addReply(s)
                  }
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:opacity-40 ${
                    isActive
                      ? "border-[#0D7377] bg-[#0D7377]/15 text-[#0D7377]"
                      : "border-[#E2E8F0] text-[#4A5568] hover:border-[#0D7377]/40 hover:text-[#1A1A2E]"
                  }`}
                >
                  {isActive ? "✓ " : "+ "}
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        {showValidation && fieldErrors.quickReplies && (
          <p className="text-sm text-red-600" role="alert">
            {fieldErrors.quickReplies}
          </p>
        )}

        {active.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-[#4A5568]">Your quick replies</p>
            {active.map((reply, i) => {
              const rowError = fieldErrors[`quickReply_${i}`];
              const rowValid =
                showValidation &&
                !rowError &&
                reply.trim().length >= 5;
              return (
                <div key={`${reply}-${i}`} className="space-y-1">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={reply}
                      onChange={(e) => updateReply(i, e.target.value)}
                      className={`flex-1 ${inputClassName(showValidation, rowError, rowValid)} py-2.5`}
                    />
                    <button
                      type="button"
                      onClick={() => removeReply(i)}
                      className="shrink-0 rounded-xl border border-[#E2E8F0] px-3 text-[#4A5568] transition hover:border-red-400/50 hover:text-red-500"
                      aria-label="Remove quick reply"
                    >
                      ✕
                    </button>
                  </div>
                  {showValidation && rowError && (
                    <p className="text-xs text-red-600">{rowError}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!atLimit && (
          <div className="flex gap-2">
            <input
              type="text"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddCustomReply())}
              placeholder="Add a custom quick reply…"
              className="flex-1 rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm text-[#1A1A2E] placeholder-[#9CA3AF] outline-none focus:border-[#0D7377]/50 focus:ring-2 focus:ring-[#0D7377]/20"
            />
            <button
              type="button"
              onClick={handleAddCustomReply}
              disabled={!custom.trim()}
              className="shrink-0 rounded-xl bg-[#0D7377]/15 px-4 py-2.5 text-sm font-semibold text-[#0D7377] transition hover:bg-[#0D7377]/25 disabled:opacity-40"
            >
              Add
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-[#E2E8F0] pt-8">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-[#1A1A2E]">Custom Questions &amp; Answers</h3>
          <p className="mt-1 text-sm text-[#4A5568]">
            Teach your bot exact answers. Each pair uses one slot
            {remaining > 0 ? ` (${remaining} remaining).` : "."}
          </p>
        </div>

        {customQA.length > 0 && (
          <div className="mb-4 space-y-3">
            {customQA.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#0D7377]">
                      Question
                    </p>
                    <p className="mt-1 text-sm font-medium text-[#1A1A2E]">{item.question}</p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[#4A5568]">
                      Answer preview
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-[#4A5568]">{item.answer}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeQA(item.id)}
                    className="shrink-0 rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-xs text-[#4A5568] transition hover:border-red-400/50 hover:bg-red-50 hover:text-red-500"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!atLimit ? (
          <div className="space-y-3 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] p-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#4A5568]">
                Question
              </label>
              <input
                type="text"
                value={draftQuestion}
                onChange={(e) => setDraftQuestion(e.target.value)}
                placeholder="e.g. Do you offer emergency appointments?"
                className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm text-[#1A1A2E] placeholder-[#9CA3AF] outline-none focus:border-[#0D7377]/50 focus:ring-2 focus:ring-[#0D7377]/20"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[#4A5568]">
                Answer
              </label>
              <textarea
                rows={3}
                value={draftAnswer}
                onChange={(e) => setDraftAnswer(e.target.value)}
                placeholder="e.g. Yes! Call us at (555) 123-4567 for same-day emergency slots."
                className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm text-[#1A1A2E] placeholder-[#9CA3AF] outline-none focus:border-[#0D7377]/50 focus:ring-2 focus:ring-[#0D7377]/20"
              />
            </div>
            <button
              type="button"
              onClick={handleAddQA}
              disabled={!draftQuestion.trim() || !draftAnswer.trim()}
              className="w-full rounded-xl bg-[#0D7377] py-2.5 text-sm font-bold text-white transition hover:bg-[#0A5D61] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Add Q&amp;A Pair
            </button>
          </div>
        ) : (
          <p className="rounded-xl border border-[#0D7377]/30 bg-[#E8F4F4] px-4 py-3 text-center text-sm text-[#0D7377]">
            You&apos;ve reached the maximum of {MAX_KNOWLEDGE_SLOTS} items. Remove a quick reply or
            Q&amp;A pair to add more.
          </p>
        )}
      </div>
    </div>
  );
}
