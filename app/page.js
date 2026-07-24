import Link from "next/link";
import { Calendar, Clock, Mail, MessageCircle, Phone, Zap } from "lucide-react";
import DemoChatSection from "../components/DemoChatSection";
import ScrollRevealInit from "../components/ScrollRevealInit";
import AboutMascotGrid from "../components/landing/AboutMascotGrid";
import ContactSection from "../components/landing/ContactSection";
import FAQSection from "../components/landing/FAQSection";
import HeroSection from "../components/landing/HeroSection";
import LandingNav from "../components/landing/LandingNav";
import { VOICE_PLANS } from "../lib/plans";

const FEATURES = [
  {
    title: "Answers Every Call",
    description:
      "Your AI receptionist picks up when you can't — after hours, mid-appointment, or three calls deep — and sounds like a real person, not a phone tree.",
    icon: Phone,
    hero: true,
  },
  {
    title: "24/7 Availability",
    description: "\"Are you open?\" gets answered at 11pm, on a holiday, or during your lunch break.",
    icon: Clock,
  },
  {
    title: "Appointment Booking",
    description: "Books the slot right there on the call, then confirms the details before hanging up.",
    icon: Calendar,
  },
  {
    title: "Every Lead Delivered",
    description: "Get an email the moment a call comes in — who called, what they needed, and what happened.",
    icon: Mail,
  },
  {
    title: "Chat Widget Included",
    description: "A branded chatbot for your website comes free with every plan — no extra charge.",
    icon: MessageCircle,
  },
  {
    title: "White-Glove Setup",
    description: "We configure call forwarding and your AI's script for you. You don't touch a line of code.",
    icon: Zap,
  },
];

function FeatureCard({ feature, delay = 0, className = "" }) {
  const { title, description, icon: Icon, hero } = feature;
  return (
    <div
      className={`reveal rounded-xl border p-8 transition-colors duration-200 ${
        hero
          ? "flex flex-col items-center text-center border-[#0D7377]/20 bg-[#0D7377] text-white"
          : "border-[#E2E8F0] bg-white hover:border-[#0D7377] hover:shadow-lg"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-xl ${
          hero ? "bg-white/15" : "bg-[#E8F4F4]"
        }`}
      >
        <Icon className={`h-6 w-6 ${hero ? "text-white" : "text-[#0D7377]"}`} strokeWidth={1.75} />
      </span>
      <h3 className={`mt-5 text-lg font-semibold ${hero ? "text-white" : "text-[#1A1A2E]"}`}>{title}</h3>
      <p className={`mt-3 text-sm leading-relaxed ${hero ? "max-w-md text-white/80" : "text-[#4A5568]"}`}>
        {description}
      </p>
    </div>
  );
}

function chatMessagesLabel(plan) {
  return plan.unlimitedChat ? "Unlimited chat messages" : `${plan.chatMessages.toLocaleString()} chat messages/month`;
}

const PLAN_COPY = {
  starter: {
    description: "Never miss a call — the essentials for a solo operation or small shop.",
    extraFeatures: [],
  },
  growth: {
    description: "More coverage for busier lines and higher call volume.",
    popular: true,
    extraFeatures: ["Everything in Starter"],
  },
  pro: {
    description: "Highest call volume, unlimited chat — built for multi-line businesses.",
    extraFeatures: ["Everything in Growth"],
  },
};

const PLANS = Object.entries(VOICE_PLANS).map(([id, plan]) => {
  const copy = PLAN_COPY[id];
  return {
    id,
    name: `${plan.label} Plan`,
    price: plan.price,
    popular: Boolean(copy.popular),
    description: copy.description,
    features: [
      ...copy.extraFeatures,
      `${plan.voiceMinutes} voice minutes/month`,
      chatMessagesLabel(plan),
      "AI phone receptionist, answers 24/7",
      "Chat widget for your website, included",
      "Bookings dashboard",
      "Email notification on every lead",
    ],
  };
});

const STEPS = [
  {
    step: "1",
    title: "Request your free demo",
    body: "Tell us about your business — services, hours, and the phone number customers call.",
  },
  {
    step: "2",
    title: "We set it up for you",
    body: "We build your AI receptionist and walk you through forwarding your business line — no code, nothing to install.",
  },
  {
    step: "3",
    title: "Never miss a call again",
    body: "Your AI answers, books appointments, and emails you every lead — even after hours.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A2E]">
      <ScrollRevealInit />
      <LandingNav />
      <HeroSection />

      {/* Features */}
      <section id="features" className="bg-white px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="reveal mb-14 max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#0D7377]">Features</p>
            <h2 className="mt-3 text-3xl font-bold text-[#1A1A2E] sm:text-4xl">
              Everything local businesses need
            </h2>
            <p className="mt-4 text-[#4A5568]">
              No call center, no answering service contract — just an AI receptionist that sounds
              like you and picks up every call you&apos;d otherwise miss.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {/* Row 1: AI Powered — full width */}
            <FeatureCard feature={FEATURES[0]} delay={0} className="col-span-3" />

            {/* Row 2: three equal cards */}
            <FeatureCard feature={FEATURES[1]} delay={75} className="col-span-1" />
            <FeatureCard feature={FEATURES[2]} delay={150} className="col-span-1" />
            <FeatureCard feature={FEATURES[3]} delay={225} className="col-span-1" />

            {/* Row 3: two cards, centered */}
            <div className="col-span-3 flex justify-center gap-4">
              <FeatureCard feature={FEATURES[4]} delay={300} className="w-1/3" />
              <FeatureCard feature={FEATURES[5]} delay={375} className="w-1/3" />
            </div>
          </div>
        </div>
      </section>

      {/* Live Demo */}
      <section id="demo" className="bg-white px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="reveal mb-12 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#0D7377]">Live Demo</p>
            <h2 className="mt-3 text-3xl font-bold text-[#1A1A2E] sm:text-4xl">
              Try the included chat widget
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[#4A5568]">
              Every plan includes this chat widget on your website, free. Chat with our sample bot
              for <strong className="text-[#0D7377]">GreenLeaf Lawn Care</strong> — try booking an
              appointment, asking about prices, or clicking a quick reply. Want to hear the AI
              receptionist instead?{" "}
              <Link href="/demo-request" className="font-semibold text-[#0D7377] underline hover:text-[#0A5D61]">
                Request a free demo
              </Link>
              .
            </p>
          </div>
          <DemoChatSection />
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-[#1A1A2E] px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="reveal mb-14 max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#14A3A8]">How It Works</p>
            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Live in three steps</h2>
            <p className="mt-4 text-white/60">From demo request to answered calls — no hardware, no hires.</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {STEPS.map((item, i) => (
              <div
                key={item.step}
                className="reveal relative rounded-xl border border-white/10 bg-white/5 p-8"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                {i < STEPS.length - 1 && (
                  <span className="absolute right-0 top-14 hidden h-px w-8 translate-x-full bg-white/15 md:block" />
                )}
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0D7377] text-lg font-bold text-white">
                  {item.step}
                </span>
                <h3 className="mt-5 text-xl font-semibold text-white">{item.title}</h3>
                <p className="mt-3 leading-relaxed text-white/60">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="bg-white px-6 py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div className="reveal">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#0D7377]">About Us</p>
            <h2 className="mt-3 text-3xl font-bold text-[#1A1A2E] sm:text-4xl">
              Leveling the playing field for local business
            </h2>
            <div className="mt-6 space-y-4 leading-relaxed text-[#4A5568]">
              <p>
                VestaChatHost was founded on a simple belief: your neighborhood dentist, salon, or gym
                deserves the same smart customer experience as a Fortune 500 company — without the
                Fortune 500 budget.
              </p>
              <p>
                We build white-label AI receptionists that answer your phone, feel personal instead
                of robotic, and never put a customer on hold. A branded chat widget for your website
                is included free — appointment booking and lead delivery are baked into both.
              </p>
              <p>
                We&apos;re brand new, and that&apos;s the point: you&apos;d be one of our first 100
                founding businesses, with direct access to the founder, your price locked in forever,
                and a real say in what we build next.
              </p>
            </div>
            <div className="mt-10 flex flex-wrap gap-10">
              {[
                { stat: "First 100", label: "Founding businesses we're onboarding personally" },
                { stat: "Locked", label: "Your founding price never goes up" },
                { stat: "Direct", label: "Line to the founder — not a support queue" },
              ].map((item) => (
                <div key={item.label} className="max-w-[11rem]">
                  <p className="text-3xl font-bold text-[#0D7377]">{item.stat}</p>
                  <p className="mt-1 text-sm text-[#4A5568]">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="reveal flex justify-center lg:justify-end" style={{ transitionDelay: "120ms" }}>
            <AboutMascotGrid />
          </div>
        </div>
      </section>

      <FAQSection />

      {/* Pricing */}
      <section id="pricing" className="bg-white px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 rounded-xl bg-[#E8F4F4] border border-[#0D7377]/20 px-6 py-4 text-center">
            <p className="text-sm font-bold text-[#0D7377] sm:text-base">
              🎉 Founding Member Offer — join as one of our first 100 businesses and your price is
              locked in forever.
            </p>
          </div>
          <div className="mb-14 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#0D7377]">Pricing</p>
            <h2 className="mt-3 text-3xl font-bold text-[#1A1A2E] sm:text-4xl">
              Less than the cost of one missed customer
            </h2>
            <p className="mt-4 text-[#4A5568]">
              Every plan includes the AI phone receptionist, the chat widget, a bookings dashboard,
              and an email the moment a lead comes in. Cancel anytime.
            </p>
          </div>
          <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-3">
            {PLANS.map((plan, i) => (
              <div
                key={plan.name}
                className={`reveal relative flex flex-col overflow-hidden rounded-2xl border p-8 transition-colors duration-200 ${
                  plan.popular
                    ? "border-[#1A1A2E] bg-[#1A1A2E] shadow-2xl lg:scale-[1.03]"
                    : "border-[#E2E8F0] bg-white hover:border-[#0D7377]"
                }`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                {plan.popular && (
                  <span className="mb-4 inline-block self-start rounded-full bg-[#0D7377] px-3 py-1 text-xs font-bold text-white">
                    MOST POPULAR
                  </span>
                )}
                <h3 className={`text-xl font-bold ${plan.popular ? "text-white" : "text-[#1A1A2E]"}`}>
                  {plan.name}
                </h3>
                <p className={`mt-2 text-sm ${plan.popular ? "text-white/70" : "text-[#4A5568]"}`}>
                  {plan.description}
                </p>
                <div className="mt-8">
                  <p>
                    <span className={`text-5xl font-bold ${plan.popular ? "text-white" : "text-[#0D7377]"}`}>
                      ${plan.price}
                    </span>
                    <span className={plan.popular ? "text-white/60" : "text-[#4A5568]"}>/mo</span>
                  </p>
                </div>
                <ul className="mt-8 flex-1 space-y-4 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#0D7377]/15 text-xs text-[#0D7377]">
                        ✓
                      </span>
                      <span className={plan.popular ? "text-white/80" : "text-[#4A5568]"}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/demo-request"
                  className={`mt-10 block rounded-xl py-3.5 text-center text-sm font-bold transition ${
                    plan.popular
                      ? "bg-white text-[#1A1A2E] hover:bg-white/90"
                      : "bg-[#0D7377] text-white hover:bg-[#0A5D61]"
                  }`}
                >
                  Get Your Free Demo
                </Link>
                <p className={`mt-3 text-center text-xs ${plan.popular ? "text-white/50" : "text-[#9CA3AF]"}`}>
                  No setup fee · Cancel anytime · White-glove onboarding
                </p>
              </div>
            ))}
          </div>
          <div className="mx-auto mt-12 max-w-3xl rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] p-6 text-sm leading-relaxed text-[#4A5568]">
            <p className="font-semibold text-[#1A1A2E]">What&apos;s a voice minute?</p>
            <p className="mt-2">
              A voice minute is one minute of your AI receptionist talking with a caller — from
              pickup to hangup. Unused minutes don&apos;t roll over to the next month. If you run
              out before your plan resets, calls fall through to normal voicemail until you upgrade
              or the next billing cycle starts. We&apos;ll always tell you upfront how close you are
              to your limit.
            </p>
            <p className="mt-3">
              Only want the chat widget?{" "}
              <Link href="/builder" className="font-semibold text-[#0D7377] underline hover:text-[#0A5D61]">
                Build a chat-only bot
              </Link>{" "}
              instead.
            </p>
          </div>
        </div>
      </section>

      <ContactSection />

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#1A1A2E] px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 md:grid-cols-4">
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0D7377] text-lg font-black text-white">
                  V
                </span>
                <span className="text-lg font-bold text-white">VestaChatHost</span>
              </Link>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/50">
                White-label AI phone receptionist and chat widget for local businesses. Compete
                with the big brands — on your terms.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-[#0D7377]">Product</h4>
              <ul className="mt-4 space-y-2 text-sm text-white/50">
                <li><a href="#features" className="hover:text-white transition">Features</a></li>
                <li><a href="#demo" className="hover:text-white transition">Live Demo</a></li>
                <li><a href="#pricing" className="hover:text-white transition">Pricing</a></li>
                <li><Link href="/builder" className="hover:text-white transition">Builder</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-[#0D7377]">Company</h4>
              <ul className="mt-4 space-y-2 text-sm text-white/50">
                <li><a href="#about" className="hover:text-white transition">About</a></li>
                <li><a href="#contact" className="hover:text-white transition">Contact</a></li>
                <li><a href="#faq" className="hover:text-white transition">FAQ</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-sm text-white/40 md:flex-row">
            <p>© {new Date().getFullYear()} VestaChatHost. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link href="/terms" className="hover:text-white transition">Terms of Service</Link>
              <Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link>
              <Link href="/privacy#do-not-sell" className="text-xs hover:text-white transition">
                Do Not Sell My Personal Information
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
