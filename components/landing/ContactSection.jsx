"use client";

import { useState } from "react";

export default function ContactSection() {
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <section id="contact" className="px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#D4AF37]">Contact</p>
          <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Let&apos;s talk</h2>
          <p className="mx-auto mt-4 max-w-xl text-[#a3a3a3]">
            Questions about VestaChatHost? We&apos;d love to hear from you.
          </p>
        </div>
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#1A1A1A] p-8">
            <h3 className="text-lg font-semibold text-white">Email us</h3>
            <a
              href="mailto:hello@vestachathost.com"
              className="mt-3 inline-block text-xl font-medium text-[#F0D060] transition hover:text-[#D4AF37]"
            >
              hello@vestachathost.com
            </a>
            <p className="mt-6 text-sm leading-relaxed text-[#a3a3a3]">
              We typically respond within one business day. For urgent onboarding help, mention
              your industry and website in your message.
            </p>
          </div>
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-white/5 bg-[#1A1A1A] p-8"
          >
            {sent ? (
              <p className="py-8 text-center text-[#F0D060]">
                Thank you! We&apos;ll get back to you soon.
              </p>
            ) : (
              <>
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-[#a3a3a3]">Your name</label>
                  <input
                    required
                    type="text"
                    className="w-full rounded-xl border border-white/10 bg-[#111111] px-4 py-3 text-white outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/30"
                  />
                </div>
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-[#a3a3a3]">Email</label>
                  <input
                    required
                    type="email"
                    className="w-full rounded-xl border border-white/10 bg-[#111111] px-4 py-3 text-white outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/30"
                  />
                </div>
                <div className="mb-6">
                  <label className="mb-2 block text-sm font-medium text-[#a3a3a3]">Message</label>
                  <textarea
                    required
                    rows={4}
                    className="w-full rounded-xl border border-white/10 bg-[#111111] px-4 py-3 text-white outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/30"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-[#D4AF37] py-3.5 font-bold text-[#0A0A0A] transition hover:bg-[#F0D060]"
                >
                  Send Message
                </button>
              </>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
