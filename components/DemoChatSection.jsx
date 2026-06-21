"use client";

import ChatWidget from "./ChatWidget";
import { GREENLEAF_DEMO_CONFIG } from "../lib/industries";

export default function DemoChatSection() {
  return (
    <div className="mx-auto max-w-lg">
      <div className="demo-container-pulse relative min-h-[520px] overflow-hidden rounded-2xl border border-[#0D7377]/25 bg-white p-4 shadow-xl shadow-black/10">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#0D7377]/40 to-transparent" />
        <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-[#0D7377]">
          GreenLeaf Lawn Care — Live Demo
        </p>
        <ChatWidget config={GREENLEAF_DEMO_CONFIG} defaultOpen embedded />
      </div>
    </div>
  );
}
