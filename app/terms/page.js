import Link from "next/link";

export const metadata = {
  title: "Terms of Service | VestaChatHost",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A2E]">
      <header className="border-b border-[#E2E8F0] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0D7377] to-[#14A3A8] text-base font-black text-white">
              V
            </span>
            <span className="text-base font-bold text-[#1A1A2E]">VestaChatHost</span>
          </Link>
          <Link href="/" className="text-sm text-[#4A5568] hover:text-[#0A5D61] transition">
            ← Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#0D7377]">Legal</p>
          <h1 className="mt-3 text-4xl font-bold text-[#1A1A2E]">Terms of Service</h1>
          <p className="mt-3 text-sm text-[#4A5568]">Last updated: July 3, 2026</p>
        </div>

        <div className="space-y-10 leading-relaxed text-[#4A5568]">
          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1A1A2E]">1. Acceptance of Terms</h2>
            <p>
              By accessing or using VestaChatHost (&ldquo;the Service&rdquo;), you agree to be bound by these
              Terms of Service. If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1A1A2E]">2. Description of Service</h2>
            <p>
              VestaChatHost provides a white-label AI chatbot widget builder and hosting platform that
              allows businesses (&ldquo;Customers&rdquo;) to create and embed an AI-powered chat widget on their
              own websites.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1A1A2E]">3. Accounts</h2>
            <p>
              You must create an account to use the builder and dashboard. You are responsible for
              maintaining the confidentiality of your account credentials and for all activity under
              your account.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1A1A2E]">4. Subscription &amp; Billing</h2>
            <p>
              The Service is offered on a monthly subscription basis. Billing is processed through
              Stripe. You may cancel your subscription at any time through the self-service billing
              portal in your dashboard; cancellation will take effect at the end of the current billing
              period. We do not provide refunds for partial billing periods except where required by law.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1A1A2E]">5. AI-Generated Content Disclaimer</h2>
            <p>
              The chatbot widget uses artificial intelligence to generate responses to end-user
              inquiries. AI-generated responses may be inaccurate, incomplete, or unsuitable for your
              specific business context. YOU ARE SOLELY RESPONSIBLE for reviewing your chatbot&apos;s
              configuration and monitoring its responses to ensure accuracy. VestaChatHost makes no
              warranty that AI-generated content will be accurate, complete, or appropriate for any
              particular purpose. You should not rely on the chatbot to provide legal, medical,
              financial, or other professional advice to your end users.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1A1A2E]">6. Service Availability</h2>
            <p>
              The Service is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; We do not guarantee
              uninterrupted or error-free operation and are not liable for any damages resulting from
              downtime, outages, or service interruptions.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1A1A2E]">7. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, VESTACHATHOST&apos;S TOTAL LIABILITY TO YOU FOR ANY
              CLAIM ARISING FROM YOUR USE OF THE SERVICE SHALL NOT EXCEED THE TOTAL AMOUNT YOU PAID TO
              VESTACHATHOST IN THE THREE (3) MONTHS PRECEDING THE CLAIM. VESTACHATHOST SHALL NOT BE
              LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
              INCLUDING LOSS OF PROFITS OR DATA, ARISING FROM YOUR USE OF THE SERVICE OR YOUR END
              USERS&apos; INTERACTIONS WITH YOUR CHATBOT.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1A1A2E]">8. Relationship with Your End Users</h2>
            <p>
              You are solely responsible for your relationship with your own website visitors and
              customers, including any transactions, bookings, or commitments made through your chatbot
              widget. VestaChatHost is not a party to any agreement between you and your end users and
              bears no responsibility for the outcome of those interactions.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1A1A2E]">9. Acceptable Use</h2>
            <p>
              You agree not to use the Service to transmit unlawful, harassing, defamatory, or
              fraudulent content, to impersonate any person or entity, or to interfere with the
              security or proper functioning of the Service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1A1A2E]">10. Termination</h2>
            <p>
              You may cancel your account at any time. We may suspend or terminate your access to the
              Service if you violate these Terms or engage in abusive behavior toward the Service&apos;s
              infrastructure (including but not limited to excessive automated requests, attempts to
              circumvent rate limiting, or unauthorized access attempts).
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1A1A2E]">11. Intellectual Property</h2>
            <p>
              You retain ownership of the content you provide (your business information, branding, and
              configuration). VestaChatHost retains all rights to the underlying software platform.
              Mascot graphics provided as part of the Service are licensed for your use solely in
              connection with your VestaChatHost chatbot widget.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1A1A2E]">12. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless VestaChatHost from any claims, damages, or
              expenses arising from your use of the Service, your chatbot&apos;s content, or your violation
              of these Terms.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1A1A2E]">13. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the Commonwealth of Pennsylvania, without regard
              to conflict of law principles.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1A1A2E]">14. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use of the Service after changes
              constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1A1A2E]">15. Contact</h2>
            <p>
              Questions about these Terms can be sent to{" "}
              <a
                href="mailto:support@vestachathost.com"
                className="text-[#0D7377] hover:underline"
              >
                support@vestachathost.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1A1A2E]">16. Message Limits &amp; Fair Use</h2>
            <p>
              Subscriptions include a monthly message allowance (Basic: 500 messages/month, Pro: 1,500
              messages/month). Message counts reset on the first day of each billing cycle. If your
              chatbot reaches its monthly limit, it will stop responding to end users until the limit
              resets or you upgrade your plan. VestaChatHost is not liable for any business impact
              resulting from a chatbot reaching its message limit.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1A1A2E]">17. Third-Party Services</h2>
            <p>
              The Service integrates with third-party providers including Anthropic (AI responses),
              Stripe (payments), Supabase (data storage), Firecrawl (website scraping), and Vercel
              (hosting). Your use of the Service is also subject to the terms and privacy policies of
              these providers. VestaChatHost is not responsible for the actions or data practices of
              these third parties.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1A1A2E]">18. Website Scraping</h2>
            <p>
              The website import feature scrapes publicly available content from URLs you provide. You
              represent that you have the right to use and import this content into your chatbot
              configuration. VestaChatHost is not responsible for the accuracy of scraped content or any
              intellectual property claims arising from content you choose to import.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-[#E2E8F0] bg-white px-6 py-8 text-center text-sm text-[#4A5568]">
        <p>
          © {new Date().getFullYear()} VestaChatHost. All rights reserved. &nbsp;·&nbsp;{" "}
          <Link href="/terms" className="hover:text-[#0A5D61]">Terms of Service</Link>
          {" "}·{" "}
          <Link href="/privacy" className="hover:text-[#0A5D61]">Privacy Policy</Link>
        </p>
      </footer>
    </div>
  );
}
