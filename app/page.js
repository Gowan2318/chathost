import Link from "next/link";
import DemoChatSection from "../components/DemoChatSection";
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
    name: "Basic Plan",
    price: 40,
    discountedPrice: 32,
    description: "Everything you need to answer customers around the clock.",
    checkoutUrl: "https://buy.stripe.com/test_8x2dR8ePrdylcO8a99c7u01?prefilled_promo_code=FOUNDING20",
    features: [
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
    name: "Pro Plan",
    price: 60,
    discountedPrice: 48,
    popular: true,
    description: "Full customization, booking, and payments — built for growth.",
    checkoutUrl: "https://buy.stripe.com/test_fZu28q22FdylbK4gxxc7u02?prefilled_promo_code=FOUNDING20",
    features: [
      "Everything in Basic",
      "Custom mascot character with their name",
      "Appointment booking flow",
      "Payment guidance with Pay Now button",
      "Custom brand color",
      "Dark and light theme choice",
      "Priority support",
      "Monthly performance report",
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

const TESTIMONIALS = [
  {
    quote:
      "We went from missing evening calls to booking 12 extra appointments a week. The mascot makes us stand out.",
    name: "Maria Santos",
    role: "Owner, Bloom & Blade Salon",
  },
  {
    quote:
      "Setup took 10 minutes. Our patients love asking about hours and insurance before they even pick up the phone.",
    name: "Dr. James Chen",
    role: "Sunrise Dental Studio",
  },
  {
    quote:
      "Finally, a chatbot that doesn't feel corporate. VestaChatHost feels like it was built for businesses like mine.",
    name: "Tony Rivera",
    role: "Rivera Realty Group",
  },
];

function SocialIcon({ children, label }) {
  return (
    <a
      href="#"
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-[#a3a3a3] transition hover:border-[#D4AF37]/50 hover:text-[#F0D060]"
    >
      {children}
    </a>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <LandingNav />
      <HeroSection />

      <section id="features" className="bg-[#111111] px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#D4AF37]">Features</p>
            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
              Everything local businesses need
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[#a3a3a3]">
              Enterprise-grade AI tools — packaged for the shop on Main Street.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-white/5 bg-[#1A1A1A] p-8 transition hover:border-[#D4AF37]/30 hover:shadow-lg hover:shadow-[#D4AF37]/5"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#D4AF37]/15 text-xl text-[#F0D060]">
                  {f.icon}
                </span>
                <h3 className="mt-5 text-lg font-semibold text-white">{f.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[#a3a3a3]">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="demo" className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#D4AF37]">Live Demo</p>
            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">See it in action</h2>
            <p className="mx-auto mt-4 max-w-2xl text-[#a3a3a3]">
              Chat with our sample bot for{" "}
              <strong className="text-[#F0D060]">GreenLeaf Lawn Care</strong>. Try booking an
              appointment, asking about prices, or clicking a quick reply.
            </p>
          </div>
          <DemoChatSection />
        </div>
      </section>

      <section id="how-it-works" className="bg-[#111111] px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#D4AF37]">How It Works</p>
            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Launch in three steps</h2>
            <p className="mt-4 text-[#a3a3a3]">From signup to live chatbot — faster than hiring staff.</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {STEPS.map((item) => (
              <div
                key={item.step}
                className="relative rounded-2xl border border-white/5 bg-[#1A1A1A] p-8"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#F0D060] text-lg font-bold text-[#0A0A0A]">
                  {item.step}
                </span>
                <h3 className="mt-5 text-xl font-semibold text-white">{item.title}</h3>
                <p className="mt-3 leading-relaxed text-[#a3a3a3]">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="px-6 py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-[#D4AF37]">About Us</p>
            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
              Leveling the playing field for local business
            </h2>
            <div className="mt-6 space-y-4 leading-relaxed text-[#a3a3a3]">
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
          </div>
          <div className="rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-br from-[#1A1A1A] to-[#111111] p-10">
            <div className="space-y-8">
              {[
                { stat: "2,500+", label: "Businesses served" },
                { stat: "1M+", label: "Conversations handled" },
                { stat: "98%", label: "Customer satisfaction" },
              ].map((item) => (
                <div key={item.label} className="border-b border-white/5 pb-6 last:border-0 last:pb-0">
                  <p className="text-4xl font-bold text-[#D4AF37]">{item.stat}</p>
                  <p className="mt-1 text-[#a3a3a3]">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#111111] px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mb-14 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#D4AF37]">Testimonials</p>
            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Loved by business owners</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <blockquote
                key={t.name}
                className="flex flex-col rounded-2xl border border-white/5 bg-[#1A1A1A] p-8"
              >
                <p className="flex-1 text-lg leading-relaxed text-white/90">&ldquo;{t.quote}&rdquo;</p>
                <footer className="mt-6 border-t border-white/5 pt-6">
                  <p className="font-semibold text-[#F0D060]">{t.name}</p>
                  <p className="text-sm text-[#a3a3a3]">{t.role}</p>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      <FAQSection />

      <section id="pricing" className="relative px-6 py-24">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#D4AF37]/5 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-6xl">
          <div className="mb-10 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#F0D060] px-6 py-4 text-center shadow-lg shadow-[#D4AF37]/20">
            <p className="text-sm font-bold text-[#0A0A0A] sm:text-base">
              🎉 Founding Member Offer — First 100 spots get 20% off forever! Discount automatically
              applied at checkout.
            </p>
          </div>
          <div className="mb-14 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#D4AF37]">Pricing</p>
            <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
              Invest in growth, not guesswork
            </h2>
            <p className="mt-4 text-[#a3a3a3]">Premium tools. Transparent pricing. Cancel anytime.</p>
          </div>
          <div className="mx-auto grid max-w-4xl gap-8 lg:grid-cols-2">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col overflow-hidden rounded-2xl border p-8 ${
                  plan.popular
                    ? "border-[#D4AF37] bg-gradient-to-b from-[#1A1A1A] to-[#111111] shadow-2xl shadow-[#D4AF37]/15"
                    : "border-white/10 bg-[#1A1A1A]"
                }`}
              >
                {plan.popular && (
                  <>
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#D4AF37] via-[#F0D060] to-[#D4AF37]" />
                    <span className="absolute -top-px left-1/2 -translate-x-1/2 rounded-b-lg bg-[#D4AF37] px-4 py-1 text-xs font-bold text-[#0A0A0A]">
                      MOST POPULAR
                    </span>
                  </>
                )}
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                <p className="mt-2 text-sm text-[#a3a3a3]">{plan.description}</p>
                <div className="mt-8">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg text-[#666666] line-through">
                      ${plan.price}/mo
                    </span>
                    <span className="rounded-full bg-[#D4AF37] px-2.5 py-0.5 text-xs font-bold text-[#0A0A0A]">
                      20% OFF
                    </span>
                  </div>
                  <p className="mt-2">
                    <span className="bg-gradient-to-r from-[#D4AF37] to-[#F0D060] bg-clip-text text-5xl font-bold text-transparent">
                      ${plan.discountedPrice}
                    </span>
                    <span className="text-[#a3a3a3]">/mo</span>
                  </p>
                  <p className="mt-2 text-sm text-[#a3a3a3]">with code FOUNDING20</p>
                </div>
                <ul className="mt-8 flex-1 space-y-4 text-sm text-[#a3a3a3]">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#D4AF37]/20 text-xs text-[#F0D060]">
                        ✓
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href={plan.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-10 block rounded-xl py-3.5 text-center text-sm font-bold transition ${
                    plan.popular
                      ? "bg-[#D4AF37] text-[#0A0A0A] hover:bg-[#F0D060] shadow-lg shadow-[#D4AF37]/20"
                      : "border border-[#D4AF37]/40 text-[#F0D060] hover:bg-[#D4AF37]/10"
                  }`}
                >
                  Get Started
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ContactSection />

      <footer className="border-t border-white/5 bg-[#111111] px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-12 md:grid-cols-4">
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#F0D060] text-lg font-black text-[#0A0A0A]">
                  V
                </span>
                <span className="text-lg font-bold text-white">VestaChatHost</span>
              </Link>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#a3a3a3]">
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
              <h4 className="text-sm font-semibold uppercase tracking-wide text-[#D4AF37]">Product</h4>
              <ul className="mt-4 space-y-2 text-sm text-[#a3a3a3]">
                <li><a href="#features" className="hover:text-[#F0D060]">Features</a></li>
                <li><a href="#demo" className="hover:text-[#F0D060]">Live Demo</a></li>
                <li><a href="#pricing" className="hover:text-[#F0D060]">Pricing</a></li>
                <li><Link href="/builder" className="hover:text-[#F0D060]">Builder</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-[#D4AF37]">Company</h4>
              <ul className="mt-4 space-y-2 text-sm text-[#a3a3a3]">
                <li><a href="#about" className="hover:text-[#F0D060]">About</a></li>
                <li><a href="#contact" className="hover:text-[#F0D060]">Contact</a></li>
                <li><a href="#faq" className="hover:text-[#F0D060]">FAQ</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 text-sm text-[#a3a3a3] md:flex-row">
            <p>© {new Date().getFullYear()} VestaChatHost. All rights reserved.</p>
            <p>Built for local businesses who refuse to settle.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
