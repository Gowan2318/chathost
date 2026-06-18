import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | VestaChatHost",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <header className="border-b border-white/5 bg-[#111111] px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#F0D060] text-base font-black text-[#0A0A0A]">
              V
            </span>
            <span className="text-base font-bold text-white">VestaChatHost</span>
          </Link>
          <Link href="/" className="text-sm text-[#a3a3a3] hover:text-[#F0D060] transition">
            ← Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#D4AF37]">Legal</p>
          <h1 className="mt-3 text-4xl font-bold text-white">Privacy Policy</h1>
          <p className="mt-3 text-sm text-[#a3a3a3]">Last updated: June 17, 2026</p>
        </div>

        <div className="space-y-10 leading-relaxed text-[#c0c0c0]">
          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">1. Information We Collect</h2>
            <ul className="space-y-2 pl-5">
              <li className="list-disc">
                <strong className="text-white">Account information:</strong> email address and
                authentication credentials, collected via our authentication provider (Supabase) when
                you sign up.
              </li>
              <li className="list-disc">
                <strong className="text-white">Business profile information:</strong> business name,
                description, address, phone number, support email, hours, and other details you enter
                into the chatbot builder.
              </li>
              <li className="list-disc">
                <strong className="text-white">Payment information:</strong> handled entirely by
                Stripe. We do not collect, see, or store your credit card number or other payment card
                details on our servers.
              </li>
              <li className="list-disc">
                <strong className="text-white">Usage and security data:</strong> IP addresses and
                request metadata, used temporarily for rate limiting and abuse prevention.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">2. Information From Your Website Visitors</h2>
            <p>
              When a visitor interacts with your chatbot widget, their messages are sent to
              Anthropic&apos;s API (Claude) to generate a response. Chat messages are processed to generate
              a reply and are not permanently stored in our database after the conversation session ends.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">3. How We Use Information</h2>
            <p>
              We use the information we collect to operate and provide the Service, process
              subscription payments, communicate with you about your account, improve and maintain the
              Service, and detect and prevent fraud or abuse.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">4. How We Share Information</h2>
            <p className="mb-4">
              We share information with the following service providers as necessary to operate the
              Service:
            </p>
            <ul className="space-y-2 pl-5">
              <li className="list-disc">Stripe (payment processing)</li>
              <li className="list-disc">Supabase (database and authentication hosting)</li>
              <li className="list-disc">Anthropic (AI chatbot response generation)</li>
              <li className="list-disc">Vercel (application hosting)</li>
            </ul>
            <p className="mt-4">We do not sell your personal information to third parties.</p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">5. Data Security</h2>
            <p>
              We use industry-standard measures including encrypted connections (HTTPS), rate limiting,
              access controls, and authentication checks to protect your information. No method of
              transmission or storage is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">6. Data Retention</h2>
            <p>
              We retain your account and business profile information for as long as your account
              remains active, and for a reasonable period afterward as needed for legal, billing, or
              security purposes.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">7. Your Rights</h2>
            <p>
              You may access, update, or request deletion of your account information at any time by
              contacting{" "}
              <a href="mailto:support@vestachathost.com" className="text-[#F0D060] hover:underline">
                support@vestachathost.com
              </a>{" "}
              or through your account dashboard.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">8. Cookies and Local Storage</h2>
            <p>
              We use browser local storage to maintain your login session. We do not use third-party
              advertising or tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">9. Children&apos;s Privacy</h2>
            <p>
              The Service is intended for use by businesses and is not directed at children under 13.
              We do not knowingly collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Continued use of the Service after
              changes constitutes acceptance of the updated Policy.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-xl font-semibold text-white">11. Contact</h2>
            <p>
              Questions about this Privacy Policy can be sent to{" "}
              <a
                href="mailto:support@vestachathost.com"
                className="text-[#F0D060] hover:underline"
              >
                support@vestachathost.com
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-white/5 bg-[#111111] px-6 py-8 text-center text-sm text-[#a3a3a3]">
        <p>
          © {new Date().getFullYear()} VestaChatHost. All rights reserved. &nbsp;·&nbsp;{" "}
          <Link href="/terms" className="hover:text-[#F0D060]">Terms of Service</Link>
          {" "}·{" "}
          <Link href="/privacy" className="hover:text-[#F0D060]">Privacy Policy</Link>
        </p>
      </footer>
    </div>
  );
}
