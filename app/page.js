import Link from "next/link";
import { Calendar, Clock, CreditCard, Smile, Sparkles, Zap } from "lucide-react";
import DemoChatSection from "../components/DemoChatSection";
import ScrollRevealInit from "../components/ScrollRevealInit";
import AboutMascotGrid from "../components/landing/AboutMascotGrid";
import ContactSection from "../components/landing/ContactSection";
import FAQSection from "../components/landing/FAQSection";
import HeroSection from "../components/landing/HeroSection";
import LandingNav from "../components/landing/LandingNav";

const FEATURES = [
  {
    title: "AI Powered",
    description:
      "Trained on your business info, so answers sound like you — not a script read off a card.",
    icon: Sparkles,
    hero: true,
  },
  {
    title: "Easy Setup",
    description: "Answer a few questions and preview your bot — most owners finish in 15 minutes.",
    icon: Zap,
  },
  {
    title: "24/7 Available",
    description: "It answers \"are you open?\" at 11pm so you don't have to.",
    icon: Clock,
  },
  {
    title: "Custom Mascots",
    description: "A friendly character with your business's name, not a generic robot avatar.",
    icon: Smile,
  },
  {
    title: "Appointment Booking",
    description: "Collects a name, date, and phone number, then books the slot before they change their mind.",
    icon: Calendar,
  },
  {
    title: "Payment Guidance",
    description: "Answers pricing questions and hands them a Pay Now button instead of \"call for a quote.\"",
    icon: CreditCard,
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

const PLANS = [
  {
    id: "basic",
    name: "Basic Plan",
    price: 40,
    discountedPrice: 32,
    description: "Everything you need to answer customers around the clock.",
    features: [
      "500 customer messages/month",
      "AI chatbot on your website",
      "Answers customer questions 24/7",
      "Re-engages visitors who go quiet",
      "8 quick reply buttons",
      "Support contact fallback",
      "Email support",
    ],
  },
  {
    id: "pro",
    name: "Pro Plan",
    price: 60,
    discountedPrice: 48,
    popular: true,
    description: "Full customization, booking, and payments — built for growth.",
    features: [
      "Everything in Basic",
      "1,500 customer messages/month",
      "Appointment booking flow",
      "Payment guidance with a Pay Now button",
      "Custom mascot with your business's name",
      "Custom brand color & theme",
      "Priority support",
    ],
  },
];

const STEPS = [
  {
    step: "1",
    title: "Build your bot",
    body: "Answer a few questions about your business, brand, and mascot in our guided builder.",
  },
  {
    step: "2",
    title: "Embed on your site",
    body: "Drop one line of code on your website. Your AI assistant goes live in minutes.",
  },
  {
    step: "3",
    title: "Delight customers 24/7",
    body: "Book appointments, answer FAQs, and route urgent requests — even after hours.",
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
              No call center, no agency contract — just a chatbot that sounds like you and works
              while you&apos;re busy with customers.
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
            <h2 className="mt-3 text-3xl font-bold text-[#1A1A2E] sm:text-4xl">See it in action</h2>
            <p className="mx-auto mt-4 max-w-2xl text-[#4A5568]">
              Chat with our sample bot for{" "}
              <strong className="text-[#0D7377]">GreenLeaf Lawn Care</strong>. Try booking an
              appointment, asking about prices, or clicking a quick reply.
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
            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Launch in three steps</h2>
            <p className="mt-4 text-white/60">From signup to live chatbot — faster than hiring staff.</p>
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
                We build white-label AI chatbots that feel personal, not robotic. With custom mascots,
                appointment booking, and payment guidance baked in, you compete on service — not just
                price.
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
              🎉 Founding Member Offer — First 100 spots get 20% off forever! Discount automatically
              applied at checkout.
            </p>
          </div>
          <div className="mb-14 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#0D7377]">Pricing</p>
            <h2 className="mt-3 text-3xl font-bold text-[#1A1A2E] sm:text-4xl">
              Less than the cost of one missed customer
            </h2>
            <p className="mt-4 text-[#4A5568]">One flat monthly price. No hidden fees. Cancel anytime.</p>
          </div>
          <div className="mx-auto grid max-w-4xl gap-8 lg:grid-cols-2">
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
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-lg line-through ${plan.popular ? "text-white/40" : "text-[#9CA3AF]"}`}>
                      ${plan.price}/mo
                    </span>
                    <span className="rounded-full bg-[#0D7377] px-2.5 py-0.5 text-xs font-bold text-white">
                      20% OFF
                    </span>
                  </div>
                  <p className="mt-2">
                    <span className={`text-5xl font-bold ${plan.popular ? "text-white" : "text-[#0D7377]"}`}>
                      ${plan.discountedPrice}
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
                  href={`/builder?plan=${plan.id}`}
                  className={`mt-10 block rounded-xl py-3.5 text-center text-sm font-bold transition ${
                    plan.popular
                      ? "bg-white text-[#1A1A2E] hover:bg-white/90"
                      : "bg-[#0D7377] text-white hover:bg-[#0A5D61]"
                  }`}
                >
                  Get Started
                </Link>
                <p className={`mt-3 text-center text-xs ${plan.popular ? "text-white/50" : "text-[#9CA3AF]"}`}>
                  No setup fee · Cancel anytime
                </p>
              </div>
            ))}
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
                White-label AI chatbots for local businesses. Compete with the big brands — on your
                terms.
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
