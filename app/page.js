import Link from "next/link";
import DemoChatSection from "../components/DemoChatSection";
import ScrollRevealInit from "../components/ScrollRevealInit";
import ContactSection from "../components/landing/ContactSection";
import FAQSection from "../components/landing/FAQSection";
import HeroSection from "../components/landing/HeroSection";
import LandingNav from "../components/landing/LandingNav";

const FEATURES = [
  {
    title: "AI Powered",
    description:
      "Claude-powered responses trained on your business info — accurate, friendly, and on-brand every time.",
    icon: "✦",
  },
  {
    title: "24/7 Available",
    description:
      "Capture leads and answer questions while you sleep. Your customers never hit a closed sign.",
    icon: "◷",
  },
  {
    title: "Easy Setup",
    description:
      "Guided builder gets you live in minutes. No developers, no complex integrations required.",
    icon: "⚡",
  },
  {
    title: "Custom Mascots",
    description:
      "Industry-specific animated characters that make your chatbot memorable and uniquely yours.",
    icon: "★",
  },
  {
    title: "Appointment Booking",
    description:
      "Built-in booking flow collects name, date, and phone — then confirms with a celebration animation.",
    icon: "📅",
  },
  {
    title: "Payment Guidance",
    description:
      "Direct customers to your payment link with pricing answers and a one-click Pay Now button.",
    icon: "💳",
  },
];

const PLANS = [
  {
    id: "basic",
    name: "Basic Plan",
    price: 40,
    discountedPrice: 32,
    description: "Everything you need to answer customers around the clock.",
    features: [
      "500 customer messages/month",
      "AI chatbot on their website",
      "Answers customer questions 24/7",
      "8 quick reply buttons",
      "Support contact fallback",
      "Loop back conversation feature",
      "Self service builder setup in 15 minutes",
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
      "Custom mascot character with their name",
      "Appointment booking flow",
      "Payment guidance with Pay Now button",
      "Custom brand color",
      "Dark and light theme choice",
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

function SocialIcon({ children, label }) {
  return (
    <a
      href="#"
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/50 transition hover:border-[#0D7377] hover:text-[#0D7377]"
    >
      {children}
    </a>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A2E]">
      <ScrollRevealInit />
      <LandingNav />
      <HeroSection />

      {/* Features */}
      <section id="features" className="bg-[#F8F9FA] px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#0D7377]">Features</p>
            <h2 className="mt-3 text-3xl font-bold text-[#1A1A2E] sm:text-4xl">
              Everything local businesses need
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[#4A5568]">
              Enterprise-grade AI tools — packaged for the shop on Main Street.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="reveal group rounded-xl border border-[#E2E8F0] bg-white p-8 transition-all duration-200 hover:border-[#0D7377] hover:-translate-y-0.5 hover:shadow-lg"
                style={{ transitionDelay: `${i * 75}ms` }}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E8F4F4] text-xl">
                  {f.icon}
                </span>
                <h3 className="mt-5 text-lg font-semibold text-[#1A1A2E]">{f.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[#4A5568]">{f.description}</p>
              </div>
            ))}
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
      <section id="how-it-works" className="bg-[#F8F9FA] px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#0D7377]">How It Works</p>
            <h2 className="mt-3 text-3xl font-bold text-[#1A1A2E] sm:text-4xl">Launch in three steps</h2>
            <p className="mt-4 text-[#4A5568]">From signup to live chatbot — faster than hiring staff.</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {STEPS.map((item, i) => (
              <div
                key={item.step}
                className="reveal rounded-xl border border-[#E2E8F0] bg-white p-8"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0D7377] text-lg font-bold text-white">
                  {item.step}
                </span>
                <h3 className="mt-5 text-xl font-semibold text-[#1A1A2E]">{item.title}</h3>
                <p className="mt-3 leading-relaxed text-[#4A5568]">{item.body}</p>
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
                Our mission is to help millions of local businesses grow with AI that works as hard as
                they do — 24 hours a day, 7 days a week.
              </p>
            </div>
            <div className="mt-10 flex flex-wrap gap-10">
              {[
                { stat: "2,500+", label: "Businesses served" },
                { stat: "1M+", label: "Conversations handled" },
                { stat: "98%", label: "Customer satisfaction" },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-4xl font-bold text-[#0D7377]">{item.stat}</p>
                  <p className="mt-1 text-sm text-[#4A5568]">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="reveal flex justify-center lg:justify-end" style={{ transitionDelay: "120ms" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&q=80"
              alt="Team working together"
              className="w-full max-w-sm rounded-2xl object-cover shadow-xl lg:max-w-md"
              style={{ aspectRatio: "4/3" }}
            />
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
              Invest in growth, not guesswork
            </h2>
            <p className="mt-4 text-[#4A5568]">Premium tools. Transparent pricing. Cancel anytime.</p>
          </div>
          <div className="mx-auto grid max-w-4xl gap-8 lg:grid-cols-2">
            {PLANS.map((plan, i) => (
              <div
                key={plan.name}
                className={`reveal relative flex flex-col overflow-hidden rounded-2xl border p-8 transition-all duration-200 ${
                  plan.popular
                    ? "border-[#1A1A2E] bg-[#1A1A2E] shadow-2xl lg:scale-[1.03] hover:-translate-y-1"
                    : "border-[#E2E8F0] bg-white hover:border-[#0D7377] hover:-translate-y-0.5 hover:shadow-lg"
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
                  <p className={`mt-2 text-sm ${plan.popular ? "text-white/50" : "text-[#4A5568]"}`}>
                    with code FOUNDING20
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
                  className={`mt-10 block rounded-xl py-3.5 text-center text-sm font-bold transition hover:scale-[1.02] ${
                    plan.popular
                      ? "border border-white/20 text-white hover:bg-white/10"
                      : "bg-[#0D7377] text-white hover:bg-[#0A5D61]"
                  }`}
                >
                  Get Started
                </Link>
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
              <div className="mt-6 flex gap-3">
                <SocialIcon label="Twitter">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </SocialIcon>
                <SocialIcon label="LinkedIn">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </SocialIcon>
                <SocialIcon label="Instagram">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </SocialIcon>
              </div>
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
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
