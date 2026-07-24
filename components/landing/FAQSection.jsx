"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "What is a voice minute?",
    a: "A voice minute is one minute of your AI receptionist actively talking with a caller, from pickup to hangup. Your plan includes a set number of minutes each month, and unused minutes don't roll over.",
  },
  {
    q: "How does it connect to my phone?",
    a: "You forward your existing business number to your AI receptionist — the same way you'd forward calls to voicemail or a call center. Your number doesn't change, and we walk you through the forwarding steps during setup.",
  },
  {
    q: "What happens when I run out of minutes?",
    a: "Once you hit your plan's monthly limit, new calls fall through to normal voicemail instead of the AI — until you upgrade your plan or the next billing cycle starts and your minutes reset. We'll let you know as you get close so it's never a surprise.",
  },
  {
    q: "Do I need to install anything?",
    a: "No. There's no hardware, no app, and no software to install. Setup is white-glove — request a demo and we configure the AI receptionist and call forwarding for you.",
  },
  {
    q: "What if I don't have a website?",
    a: "That's fine — the AI phone receptionist works over your business phone line and doesn't require a website. The chat widget (included free) is optional and only goes live if you build and embed it.",
  },
  {
    q: "Do I need technical skills?",
    a: "No coding required. We handle the AI receptionist setup, appointment booking, and lead delivery. If you also build the included chat widget, our guided builder walks you through it with copy-and-paste embed instructions.",
  },
  {
    q: "Can I customize the chatbot to match my brand?",
    a: "Yes. Choose your brand colors, quick reply buttons, industry mascot, and business information. Your customers see a fully branded experience.",
  },
  {
    q: "What happens when the AI doesn't know an answer?",
    a: "Your AI receptionist and chat widget both automatically share your support phone and email so customers always reach a real person. You stay in control of escalations.",
  },
  {
    q: "Is there a contract or long-term commitment?",
    a: "All plans are month-to-month. Upgrade, downgrade, or cancel anytime. We're built for local businesses that need flexibility.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" className="bg-[#F8F9FA] px-6 py-24">
      <div className="mx-auto max-w-3xl">
        <div className="mb-14 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#0D7377]">FAQ</p>
          <h2 className="mt-3 text-3xl font-bold text-[#1A1A2E] sm:text-4xl">Common questions</h2>
        </div>
        <div className="space-y-3">
          {FAQS.map((item, i) => (
            <div
              key={item.q}
              className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === i ? -1 : i)}
                className="flex w-full items-center justify-between px-6 py-5 text-left"
              >
                <span className="pr-4 font-semibold text-[#1A1A2E]">{item.q}</span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E8F4F4] text-[#0D7377] font-bold">
                  {openIndex === i ? "−" : "+"}
                </span>
              </button>
              {openIndex === i && (
                <div className="border-t border-[#E2E8F0] px-6 pb-5 pt-4">
                  <p className="leading-relaxed text-[#4A5568]">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
