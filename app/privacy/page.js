import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | VestaChatHost",
};

export default function PrivacyPage() {
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
          <h1 className="mt-3 text-4xl font-bold text-[#1A1A2E]">Privacy Policy</h1>
          <p className="mt-3 text-sm text-[#4A5568]">Last updated: July 3, 2026</p>
        </div>

        <div className="space-y-10 leading-relaxed text-[#4A5568]">
          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1A1A2E]">1. Information We Collect</h2>
            <ul className="space-y-2 pl-5">
              <li className="list-disc">
                <strong className="text-[#1A1A2E]">Account information:</strong> email address and
                authentication credentials, collected via our authentication provider (Supabase) when
                you sign up.
              </li>
              <li className="list-disc">
                <strong className="text-[#1A1A2E]">Chatbot configuration:</strong> business name,
                description, address, phone number, support email, hours, branding, and other details
                you enter into the chatbot builder.
              </li>
              <li className="list-disc">
                <strong className="text-[#1A1A2E]">Conversation logs:</strong> messages exchanged
                between your chatbot and your website visitors, stored so you can review activity and
                so we can generate usage metrics for your account.
              </li>
              <li className="list-disc">
                <strong className="text-[#1A1A2E]">Usage metrics:</strong> monthly message counts,
                billing cycle dates, and related account activity used to enforce plan limits and
                measure engagement.
              </li>
              <li className="list-disc">
                <strong className="text-[#1A1A2E]">Payment information:</strong> handled entirely by
                Stripe. We do not collect, see, or store your credit card number or other payment card
                details on our servers.
              </li>
              <li className="list-disc">
                <strong className="text-[#1A1A2E]">Usage and security data:</strong> IP addresses and
                request metadata, used temporarily for rate limiting and abuse prevention.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1A1A2E]">2. Information From Your Website Visitors</h2>
            <p>
              When a visitor interacts with your chatbot widget, their messages are sent to
              Anthropic&apos;s API (Claude) to generate a response. Both the visitor&apos;s messages and the
              chatbot&apos;s replies are stored as conversation logs (see Section 6, Data Retention) so
              that you can review activity and so we can track usage against your plan&apos;s message
              limit.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1A1A2E]">3. How We Use Information</h2>
            <p>
              We use the information we collect to provide and operate the Service, send transactional
              emails (such as account, billing, and usage-limit notifications), monitor and enforce
              monthly message limits, process subscription payments, communicate with you about your
              account, improve and maintain the platform, and detect and prevent fraud or abuse.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1A1A2E]">4. Third-Party Processors</h2>
            <p className="mb-4">
              We share information with the following service providers as necessary to operate the
              Service:
            </p>
            <ul className="space-y-2 pl-5">
              <li className="list-disc">
                <strong className="text-[#1A1A2E]">Anthropic</strong> — processes chatbot conversation
                messages to generate AI responses.
              </li>
              <li className="list-disc">
                <strong className="text-[#1A1A2E]">Stripe</strong> — processes subscription payments and
                billing information.
              </li>
              <li className="list-disc">
                <strong className="text-[#1A1A2E]">Supabase</strong> — hosts our database and handles
                account authentication.
              </li>
              <li className="list-disc">
                <strong className="text-[#1A1A2E]">Firecrawl</strong> — scrapes publicly available
                content from website URLs you provide during setup.
              </li>
              <li className="list-disc">
                <strong className="text-[#1A1A2E]">Vercel</strong> — hosts and serves the application.
              </li>
              <li className="list-disc">
                <strong className="text-[#1A1A2E]">Resend</strong> — delivers transactional emails
                (welcome, usage, and billing notifications) on our behalf.
              </li>
            </ul>
            <p className="mt-4">We do not sell your personal information to third parties.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1A1A2E]">5. Data Security</h2>
            <p>
              We use industry-standard measures including encrypted connections (HTTPS), rate limiting,
              access controls, and authentication checks to protect your information. No method of
              transmission or storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1A1A2E]">6. Data Retention</h2>
            <p>
              Conversation logs (visitor messages and chatbot replies) are retained for 90 days and then
              deleted. Account and business profile information is retained for as long as your account
              remains active, and is deleted upon account deletion except where we are required to
              retain it for a reasonable period for legal, billing, or security purposes.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1A1A2E]">7. Your Rights</h2>
            <p>
              You may access, correct, or request deletion of your account information and data at any
              time by contacting{" "}
              <a href="mailto:support@vestachathost.com" className="text-[#0D7377] hover:underline">
                support@vestachathost.com
              </a>{" "}
              or through your account dashboard.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1A1A2E]">8. Cookies</h2>
            <p>
              We use essential cookies and local browser storage solely to maintain your authenticated
              session. We do not use third-party advertising or tracking cookies.
            </p>
          </section>

          <section id="do-not-sell">
            <h2 className="mb-3 text-xl font-semibold text-[#1A1A2E]">
              9. Do Not Sell My Personal Information
            </h2>
            <p>
              VestaChatHost does not sell personal information to third parties. California residents
              may request deletion of their data by emailing{" "}
              <a href="mailto:support@vestachathost.com" className="text-[#0D7377] hover:underline">
                support@vestachathost.com
              </a>
              . We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1A1A2E]">10. Children&apos;s Privacy</h2>
            <p>
              The Service is intended for use by businesses and is not directed at, or intended for use
              by, anyone under 18 years of age. We do not knowingly collect personal information from
              children.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1A1A2E]">11. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Continued use of the Service after
              changes constitutes acceptance of the updated Policy.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-[#1A1A2E]">12. Contact</h2>
            <p>
              Questions about this Privacy Policy can be sent to{" "}
              <a
                href="mailto:support@vestachathost.com"
                className="text-[#0D7377] hover:underline"
              >
                support@vestachathost.com
              </a>
              .
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
