"use client";

import Link from "next/link";
import MascotCharacter from "../mascots/MascotCharacter";

export default function HeroSection() {
  return (
    <section
      id="home"
      className="relative overflow-hidden bg-[#0A0A0A] px-6 pb-24 pt-16 md:pt-28"
    >
      <div className="pointer-events-none absolute left-1/2 top-20 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[#D4AF37]/10 blur-[120px] hero-glow-orb" />
      <div className="pointer-events-none absolute -right-20 top-40 h-64 w-64 rounded-full bg-[#F0D060]/5 blur-3xl hero-float" />
      <div className="pointer-events-none absolute -left-16 bottom-20 h-48 w-48 rounded-full bg-[#D4AF37]/8 blur-3xl hero-float-delay" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
        <div className="text-center lg:text-left">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-[#1A1A1A] px-4 py-1.5 text-sm font-medium text-[#F0D060]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#D4AF37]" />
            White-label AI for local businesses
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            Give Your Business a{" "}
            <span className="hero-shimmer-text">24/7 AI Assistant</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[#a3a3a3] lg:mx-0">
            Never miss another lead. VestaChatHost gives salons, dentists, gyms, and local shops
            enterprise-grade AI chat — with your brand, your mascot, and your voice.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
            <Link
              href="/builder"
              className="inline-flex items-center justify-center rounded-full bg-[#D4AF37] px-8 py-4 text-base font-bold text-[#0A0A0A] shadow-xl shadow-[#D4AF37]/20 transition hover:bg-[#F0D060] hover:shadow-[#F0D060]/25"
            >
              Build My Chatbot Free
            </Link>
            <a
              href="#demo"
              className="inline-flex items-center justify-center rounded-full border border-[#D4AF37]/40 bg-transparent px-8 py-4 text-base font-semibold text-[#F0D060] transition hover:border-[#F0D060] hover:bg-[#D4AF37]/10"
            >
              Try the Live Demo
            </a>
          </div>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 lg:justify-start">
            {[
              { value: "24/7", label: "Always on" },
              { value: "15 min", label: "Setup time" },
              { value: "8+", label: "Industries" },
            ].map((stat) => (
              <div key={stat.label} className="text-center lg:text-left">
                <p className="text-2xl font-bold text-[#D4AF37]">{stat.value}</p>
                <p className="text-xs uppercase tracking-wide text-[#a3a3a3]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex justify-center">
          <div className="hero-float relative rounded-3xl border border-[#D4AF37]/20 bg-gradient-to-b from-[#1A1A1A] to-[#111111] p-8 shadow-2xl shadow-black/50">
            <div className="absolute -inset-px rounded-3xl bg-gradient-to-b from-[#D4AF37]/30 to-transparent opacity-50" />
            <div className="relative flex flex-col items-center gap-4">
              <MascotCharacter industry="lawn" animation="bounce" size={140} />
              <p className="text-center text-sm font-medium text-[#a3a3a3]">
                Meet <span className="text-[#F0D060]">Leafy</span> — your branded mascot
              </p>
              <div className="mt-2 w-full max-w-xs rounded-2xl border border-white/5 bg-[#0A0A0A] p-4 text-left text-sm text-[#a3a3a3]">
                <p className="text-[#D4AF37]">GreenLeaf Bot</p>
                <p className="mt-1">Hi! 👋 How can I help you book today?</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
