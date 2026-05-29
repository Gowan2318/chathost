"use client";

import ChatWidget from "./ChatWidget";
import { GREENLEAF_DEMO_CONFIG } from "../lib/industries";

export default function DemoChatSection() {
  return (
    <div className="mx-auto max-w-lg">
      <div className="relative min-h-[520px] overflow-hidden rounded-2xl border border-[#D4AF37]/25 bg-[#1A1A1A] p-4 shadow-2xl shadow-black/40">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent" />
        <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-[#D4AF37]">
          GreenLeaf Lawn Care — Live Demo
        </p>
        <ChatWidget config={GREENLEAF_DEMO_CONFIG} defaultOpen embedded />
      </div>
    </div>
  );
}
