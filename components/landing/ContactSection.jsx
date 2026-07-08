"use client";

import { useState } from "react";

export default function ContactSection() {
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <section id="contact" className="bg-white px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#0D7377]">Contact</p>
          <h2 className="mt-3 text-3xl font-bold text-[#1A1A2E] sm:text-4xl">Let&apos;s talk</h2>
          <p className="mx-auto mt-4 max-w-xl text-[#4A5568]">
            Questions about VestaChatHost? We&apos;d love to hear from you.
          </p>
        </div>
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] p-8">
            <h3 className="text-lg font-semibold text-[#1A1A2E]">Email us</h3>
            <a
              href="mailto:hello@vestachathost.com"
              className="mt-3 inline-block text-xl font-medium text-[#0D7377] transition hover:text-[#0A5D61]"
            >
              hello@vestachathost.com
            </a>
            <p className="mt-6 text-sm leading-relaxed text-[#4A5568]">
              We typically respond within one business day. For urgent onboarding help, mention
              your industry and website in your message.
            </p>
          </div>
          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-[#E2E8F0] bg-white p-8 shadow-sm"
          >
            {sent ? (
              <p className="py-8 text-center text-[#0D7377] font-medium">
                Thank you! We&apos;ll get back to you soon.
              </p>
            ) : (
              <>
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-[#4A5568]">Your name</label>
                  <input
                    required
                    type="text"
                    className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8F9FA] px-4 py-3 text-[#1A1A2E] outline-none focus:border-[#0D7377] focus:ring-1 focus:ring-[#0D7377]/30"
                  />
                </div>
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-[#4A5568]">Email</label>
                  <input
                    required
                    type="email"
                    className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8F9FA] px-4 py-3 text-[#1A1A2E] outline-none focus:border-[#0D7377] focus:ring-1 focus:ring-[#0D7377]/30"
                  />
                </div>
                <div className="mb-6">
                  <label className="mb-2 block text-sm font-medium text-[#4A5568]">Message</label>
                  <textarea
                    required
                    rows={4}
                    className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8F9FA] px-4 py-3 text-[#1A1A2E] outline-none focus:border-[#0D7377] focus:ring-1 focus:ring-[#0D7377]/30"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-[#0D7377] py-3.5 font-bold text-white transition hover:bg-[#0A5D61]"
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
