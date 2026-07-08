"use client";

import Link from "next/link";
import HeroChatMock from "./HeroChatMock";

export default function HeroSection() {
  return (
    <section
      id="home"
      className="relative overflow-hidden bg-white px-6 pb-24 pt-16 md:pt-28"
    >
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        {/* Left — text */}
        <div className="text-center lg:text-left">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#0D7377]/30 bg-[#E8F4F4] px-4 py-1.5 text-sm font-medium text-[#0D7377]">
            <span className="h-2 w-2 rounded-full bg-[#0D7377]" />
            White-label AI for local businesses
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-[#1A1A2E] sm:text-5xl lg:text-6xl">
            Give Your Business a{" "}
            <span className="text-[#0D7377]">24/7 AI Assistant</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[#4A5568] lg:mx-0">
            Never miss another lead. Salons, dentists, gyms, and local shops use VestaChatHost to
            answer questions and book appointments — day or night, in your own voice.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
            <Link
              href="/builder"
              className="inline-flex items-center justify-center rounded-lg bg-[#0D7377] px-8 py-4 text-base font-bold text-white shadow-md transition hover:bg-[#0A5D61]"
            >
              Start Building Free
            </Link>
            <a
              href="#demo"
              className="inline-flex items-center justify-center rounded-lg border border-[#0D7377] bg-white px-8 py-4 text-base font-semibold text-[#0D7377] transition hover:bg-[#E8F4F4]"
            >
              Try the Live Demo
            </a>
          </div>
          <p className="mt-4 text-sm text-[#4A5568]">
            Free to build and preview — pay only when you publish.
          </p>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 lg:justify-start">
            {[
              { value: "24/7", label: "Always on" },
              { value: "15 min", label: "Setup time" },
              { value: "8+", label: "Industries" },
            ].map((stat) => (
              <div key={stat.label} className="text-center lg:text-left">
                <p className="text-2xl font-bold text-[#0D7377]">{stat.value}</p>
                <p className="text-xs uppercase tracking-wide text-[#4A5568]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right — product mock */}
        <div className="flex justify-center lg:justify-end">
          <HeroChatMock />
        </div>
      </div>
    </section>
  );
}
