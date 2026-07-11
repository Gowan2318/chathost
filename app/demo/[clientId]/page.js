import Link from "next/link";
import Script from "next/script";
import { CalendarCheck, Clock, Code2, Globe, MessageCircleQuestion, Palette } from "lucide-react";
import MascotCharacter from "../../../components/mascots/MascotCharacter";
import { getSupabaseClient } from "../../../lib/supabase";
import { INDUSTRY_LABELS } from "../../../lib/industries";

// Demo config can change any time a business owner edits their bot in the
// dashboard, and this page is shared externally — always fetch fresh.
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getChatbotConfig(rawClientId) {
  const clientId = rawClientId?.trim();
  if (!clientId || !UUID_RE.test(clientId)) return null;

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("chatbots")
      .select("config")
      .eq("client_id", clientId)
      .maybeSingle();

    if (error || !data?.config) return null;
    return data.config;
  } catch (err) {
    console.error("Demo page config fetch error:", err);
    return null;
  }
}

function industryPhrase(industry) {
  if (!industry || industry === "other") return "local";
  return (INDUSTRY_LABELS[industry] || "local").toLowerCase();
}

export async function generateMetadata({ params }) {
  const { clientId } = await params;
  const config = await getChatbotConfig(clientId);

  if (!config) {
    return { title: "Demo Not Found | VestaChatHost" };
  }

  const phrase = industryPhrase(config.industry);
  return {
    title: `Live AI Assistant Demo for ${phrase.charAt(0).toUpperCase() + phrase.slice(1)} Businesses | VestaChatHost`,
    description: `See what a live AI chatbot demo can do for your ${phrase} business.`,
  };
}

function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0D7377] to-[#14A3A8] text-base font-black text-white shadow shadow-[#0D7377]/25">
        V
      </span>
      <span className="text-lg font-bold tracking-tight text-[#1A1A2E]">
        Vesta<span className="text-[#0D7377]">Chat</span>Host
      </span>
    </span>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8F9FA] px-6 text-center">
      <a href="https://vestachathost.com" className="mb-10 transition hover:opacity-90">
        <Logo />
      </a>
      <h1 className="text-3xl font-bold text-[#1A1A2E]">Demo not found</h1>
      <p className="mt-4 max-w-md text-[#4A5568]">
        We couldn&apos;t find a demo at this link. It may have expired, or the link may have been
        copied incorrectly.
      </p>
      <a
        href="https://vestachathost.com"
        className="mt-8 rounded-xl bg-[#0D7377] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#0A5D61]"
      >
        Visit vestachathost.com
      </a>
    </div>
  );
}

const STEPS = [
  {
    icon: Globe,
    title: "We build it from your website",
    body: "Give us your website — our AI reads it and builds a working chatbot in about 15 minutes.",
  },
  {
    icon: Palette,
    title: "You customize colors, mascot, and answers",
    body: "Pick your brand color, choose a mascot, and fine-tune how it answers common questions.",
  },
  {
    icon: Code2,
    title: "Paste one line of code — done",
    body: "Drop a single script tag on your site and your AI assistant goes live instantly.",
  },
];

const BENEFITS = [
  {
    icon: MessageCircleQuestion,
    title: "Never miss a customer question",
    body: "Every visitor gets an instant, accurate answer — no more \"let me check and call you back.\"",
  },
  {
    icon: Clock,
    title: "Works 24/7, even when you're closed",
    body: "Nights, weekends, holidays — it's always on shift, so customers never hit a dead end.",
  },
  {
    icon: CalendarCheck,
    title: "Turns website visitors into bookings and calls",
    body: "It doesn't just answer questions — it guides visitors toward booking an appointment or reaching out directly.",
  },
];

export default async function DemoPage({ params }) {
  const { clientId: rawClientId } = await params;
  const config = await getChatbotConfig(rawClientId);

  if (!config) {
    return <NotFound />;
  }

  const clientId = rawClientId.trim();
  const businessName = config.businessName || "This business";
  const industry = config.industry || "other";
  const phrase = industryPhrase(industry);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A2E]">
      {/* Nav */}
      <header className="border-b border-[#E2E8F0] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <a href="https://vestachathost.com" className="transition hover:opacity-90">
            <Logo />
          </a>
          <Link
            href="/builder"
            className="rounded-lg bg-[#0D7377] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0A5D61]"
          >
            Build Mine Free
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#0D7377]">
            Live demo
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
            See what an AI assistant can do for your {phrase} business
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#4A5568]">
            This is a live demo built for a {phrase} business. Click the chat bubble in the
            bottom right and ask it anything — about hours, services, booking, pricing. Yours
            would be customized with YOUR business&apos;s real info.
          </p>
        </div>

        {/* Mockup */}
        <div className="mx-auto mt-14 max-w-2xl">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-10 shadow-xl shadow-[#0D7377]/5">
            <div className="flex flex-col items-center gap-4 text-center">
              <MascotCharacter industry={industry} size={140} animation="bounce" />
              <div>
                <p className="text-xl font-bold text-[#1A1A2E]">{businessName}</p>
                <p className="text-sm text-[#4A5568]">Powered by VestaChatHost</p>
              </div>
              <div className="mt-2 flex items-center gap-2 rounded-full bg-[#E8F4F4] px-4 py-2 text-sm font-medium text-[#0D7377]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#0D7377]" />
                Online now — try the chat bubble in the corner
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">How it works</h2>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="relative rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] p-8">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0D7377] text-lg font-bold text-white">
                  {i + 1}
                </span>
                <span className="mt-5 flex h-10 w-10 items-center justify-center rounded-lg bg-[#0D7377]/10">
                  <s.icon className="h-5 w-5 text-[#0D7377]" strokeWidth={1.75} />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-[#1A1A2E]">{s.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[#4A5568]">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold sm:text-4xl">
            Why local businesses love this
          </h2>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {BENEFITS.map((b) => (
              <div key={b.title} className="rounded-xl border border-[#E2E8F0] bg-white p-8">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0D7377]/10">
                  <b.icon className="h-6 w-6 text-[#0D7377]" strokeWidth={1.75} />
                </span>
                <h3 className="mt-5 text-lg font-semibold text-[#1A1A2E]">{b.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[#4A5568]">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#1A1A2E] px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Want one for YOUR business?
          </h2>
          <p className="mt-4 text-lg text-white/70">
            Built from your website, customized to your brand, live in 15 minutes.
          </p>
          <Link
            href="/builder"
            className="mt-8 inline-block rounded-xl bg-[#0D7377] px-8 py-4 text-base font-bold text-white shadow-lg shadow-[#0D7377]/30 transition hover:bg-[#0A5D61]"
          >
            Build Mine Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E2E8F0] bg-white px-6 py-8 text-center">
        <p className="text-sm text-[#4A5568]">
          Built by VestaChatHost ·{" "}
          <a href="https://vestachathost.com" className="text-[#0D7377] hover:text-[#0A5D61]">
            vestachathost.com
          </a>{" "}
          · No obligation
        </p>
      </footer>

      <Script
        id="vestachathost-widget"
        src={`https://vestachathost.com/widget.js?id=${clientId}`}
        strategy="afterInteractive"
      />
    </div>
  );
}
