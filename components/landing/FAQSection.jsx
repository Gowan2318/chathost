"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "How long does it take to set up my chatbot?",
    a: "Most businesses launch in under 15 minutes using our guided builder. Enter your business details, pick your mascot, preview your bot, and embed one line of code on your site.",
  },
  {
    q: "Do I need technical skills?",
    a: "No coding required. VestaChatHost handles AI conversations, appointment booking flows, and payment guidance out of the box. We provide copy-and-paste embed instructions.",
  },
  {
    q: "Can I customize the chatbot to match my brand?",
    a: "Yes. Choose your brand colors, quick reply buttons, industry mascot, and business information. Your customers see a fully branded experience.",
  },
  {
    q: "What happens when the AI doesn't know an answer?",
    a: "Your chatbot automatically shares your support phone and email so customers always reach a real person. You stay in control of escalations.",
  },
  {
    q: "Is there a contract or long-term commitment?",
    a: "All plans are month-to-month. Upgrade, downgrade, or cancel anytime. We're built for local businesses that need flexibility.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" className="bg-[#111111] px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <div className="mb-14 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#D4AF37]">FAQ</p>
          <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Common questions</h2>
        </div>
        <div className="space-y-3">
          {FAQS.map((item, i) => (
            <div
              key={item.q}
              className="overflow-hidden rounded-2xl border border-white/5 bg-[#1A1A1A]"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === i ? -1 : i)}
                className="flex w-full items-center justify-between px-6 py-5 text-left"
              >
                <span className="pr-4 font-semibold text-white">{item.q}</span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D4AF37]/15 text-[#D4AF37]">
                  {openIndex === i ? "−" : "+"}
                </span>
              </button>
              {openIndex === i && (
                <div className="border-t border-white/5 px-6 pb-5 pt-0">
                  <p className="leading-relaxed text-[#a3a3a3]">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
