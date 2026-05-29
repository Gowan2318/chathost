"use client";

import { useState } from "react";
import { MAX_KNOWLEDGE_SLOTS, countKnowledgeSlots } from "../../lib/builder-form";
import { getIndustryQuickReplySuggestions } from "../../lib/builder-quick-replies";
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
}) {
  const [custom, setCustom] = useState("");
  const [draftQuestion, setDraftQuestion] = useState("");
  const [draftAnswer, setDraftAnswer] = useState("");

  const suggestions = getIndustryQuickReplySuggestions(industry);
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
      <div className="flex items-center justify-between rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/5 px-4 py-3">
        <p className="text-sm text-[#a3a3a3]">
          Quick replies + custom Q&amp;A share one limit
        </p>
        <span
          className={`rounded-full px-3 py-1 text-sm font-bold ${
            atLimit
              ? "bg-[#D4AF37] text-[#0A0A0A]"
              : "bg-[#1A1A1A] text-[#F0D060] ring-1 ring-[#D4AF37]/40"
          }`}
        >
          {used}/{MAX_KNOWLEDGE_SLOTS} used
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-[#a3a3a3]">
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
                      ? "border-[#D4AF37] bg-[#D4AF37]/20 text-[#F0D060]"
                      : "border-white/10 text-[#a3a3a3] hover:border-[#D4AF37]/40 hover:text-white"
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
          <p className="text-sm text-red-400" role="alert">
            {fieldErrors.quickReplies}
          </p>
        )}

        {active.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-[#a3a3a3]">Your quick replies</p>
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
                    className="shrink-0 rounded-xl border border-white/10 px-3 text-[#a3a3a3] transition hover:border-red-500/50 hover:text-red-400"
                    aria-label="Remove quick reply"
                  >
                    ✕
                  </button>
                </div>
                {showValidation && rowError && (
                  <p className="text-xs text-red-400">{rowError}</p>
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
              className="flex-1 rounded-xl border border-white/10 bg-[#111111] px-4 py-2.5 text-sm text-white outline-none focus:border-[#D4AF37]/50 focus:ring-2 focus:ring-[#D4AF37]/20"
            />
            <button
              type="button"
              onClick={handleAddCustomReply}
              disabled={!custom.trim()}
              className="shrink-0 rounded-xl bg-[#D4AF37]/20 px-4 py-2.5 text-sm font-semibold text-[#F0D060] transition hover:bg-[#D4AF37]/30 disabled:opacity-40"
            >
              Add
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-white/10 pt-8">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-white">Custom Questions &amp; Answers</h3>
          <p className="mt-1 text-sm text-[#a3a3a3]">
            Teach your bot exact answers. Each pair uses one slot
            {remaining > 0 ? ` (${remaining} remaining).` : "."}
          </p>
        </div>

        {customQA.length > 0 && (
          <div className="mb-4 space-y-3">
            {customQA.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-[#D4AF37]/20 bg-[#111111] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#D4AF37]">
                      Question
                    </p>
                    <p className="mt-1 text-sm font-medium text-white">{item.question}</p>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[#a3a3a3]">
                      Answer preview
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-[#a3a3a3]">{item.answer}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeQA(item.id)}
                    className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-[#a3a3a3] transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!atLimit ? (
          <div className="space-y-3 rounded-xl border border-white/10 bg-[#0A0A0A]/50 p-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#a3a3a3]">
                Question
              </label>
              <input
                type="text"
                value={draftQuestion}
                onChange={(e) => setDraftQuestion(e.target.value)}
                placeholder="e.g. Do you offer emergency appointments?"
                className="w-full rounded-xl border border-white/10 bg-[#111111] px-4 py-2.5 text-sm text-white outline-none focus:border-[#D4AF37]/50 focus:ring-2 focus:ring-[#D4AF37]/20"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[#a3a3a3]">
                Answer
              </label>
              <textarea
                rows={3}
                value={draftAnswer}
                onChange={(e) => setDraftAnswer(e.target.value)}
                placeholder="e.g. Yes! Call us at (555) 123-4567 for same-day emergency slots."
                className="w-full rounded-xl border border-white/10 bg-[#111111] px-4 py-2.5 text-sm text-white outline-none focus:border-[#D4AF37]/50 focus:ring-2 focus:ring-[#D4AF37]/20"
              />
            </div>
            <button
              type="button"
              onClick={handleAddQA}
              disabled={!draftQuestion.trim() || !draftAnswer.trim()}
              className="w-full rounded-xl bg-[#D4AF37] py-2.5 text-sm font-bold text-[#0A0A0A] transition hover:bg-[#F0D060] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Add Q&amp;A Pair
            </button>
          </div>
        ) : (
          <p className="rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-4 py-3 text-center text-sm text-[#F0D060]">
            You&apos;ve reached the maximum of {MAX_KNOWLEDGE_SLOTS} items. Remove a quick reply or
            Q&amp;A pair to add more.
          </p>
        )}
      </div>
    </div>
  );
}
