import MascotCharacter from "../../../components/mascots/MascotCharacter";
import { adminClient } from "../../../lib/supabase-admin";
import { INDUSTRY_LABELS } from "../../../lib/industries";
import VoiceDemoClient from "./VoiceDemoClient";

// Same reasoning as app/demo/[clientId]/page.js — this is a public, shared
// link, and the underlying assistant can change, so never cache it.
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Service role, not the anon client — same reasoning as app/demo/[clientId]/page.js:
// this page is public/unauthenticated by design, and the anon SELECT policy on
// chatbots was removed (migration 017) since it exposed every column, not just
// `config`, to anyone with the (necessarily public) anon key. Only businessName,
// industry, and the assistant id are ever read out of the row and passed down —
// nothing else in this row (contact info, booking history, subscription status,
// user_id, etc.) is selected or forwarded to the client.
async function getVoiceDemo(rawClientId) {
  const clientId = rawClientId?.trim();
  if (!clientId || !UUID_RE.test(clientId)) return null;

  try {
    const { data, error } = await adminClient()
      .from("chatbots")
      .select("config, vapi_assistant_id")
      .eq("client_id", clientId)
      .maybeSingle();

    if (error || !data?.vapi_assistant_id || !data?.config?.businessName) return null;

    return {
      businessName: data.config.businessName,
      industry: data.config.industry || "other",
      assistantId: data.vapi_assistant_id,
    };
  } catch (err) {
    console.error("Voice demo config fetch error:", err);
    return null;
  }
}

function industryPhrase(industry) {
  if (!industry || industry === "other") return "local";
  return (INDUSTRY_LABELS[industry] || "local").toLowerCase();
}

export async function generateMetadata({ params }) {
  const { clientId } = await params;
  const demo = await getVoiceDemo(clientId);

  if (!demo) {
    return { title: "Voice Demo Not Found | VestaChatHost" };
  }

  const phrase = industryPhrase(demo.industry);
  return {
    title: `Live AI Voice Receptionist Demo for ${demo.businessName} | VestaChatHost`,
    description: `Talk to a live AI phone receptionist built for ${demo.businessName}, a ${phrase} business.`,
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

function NotAvailable() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8F9FA] px-6 text-center">
      <a href="https://vestachathost.com" className="mb-10 transition hover:opacity-90">
        <Logo />
      </a>
      <h1 className="text-3xl font-bold text-[#1A1A2E]">Voice demo not available</h1>
      <p className="mt-4 max-w-md text-[#4A5568]">
        We couldn&apos;t find a voice demo at this link. It may have expired, or the link may
        have been copied incorrectly.
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

export default async function VoiceDemoPage({ params }) {
  const { clientId: rawClientId } = await params;
  const demo = await getVoiceDemo(rawClientId);

  if (!demo) {
    return <NotAvailable />;
  }

  const phrase = industryPhrase(demo.industry);

  return (
    <div className="flex min-h-screen flex-col bg-[#F8F9FA] text-[#1A1A2E]">
      <header className="border-b border-[#E2E8F0] bg-white px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <a href="https://vestachathost.com" className="transition hover:opacity-90">
            <Logo />
          </a>
          <span className="hidden text-sm font-medium text-[#4A5568] sm:inline">
            Live voice demo
          </span>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-14">
        <div className="mx-auto w-full max-w-md text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#0D7377]">
            Live voice demo
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">
            Talk to {demo.businessName}&apos;s AI receptionist
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-base leading-relaxed text-[#4A5568]">
            This is a live demo of an AI receptionist for {demo.businessName} — talk to it like a
            customer would. Ask about hours, services, or try booking an appointment.
          </p>
        </div>

        <div className="mx-auto mt-10 w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-8 shadow-xl shadow-[#0D7377]/5 sm:p-10">
          <div className="flex flex-col items-center gap-4 text-center">
            <MascotCharacter industry={demo.industry} size={140} animation="idle" />
            <div>
              <p className="text-xl font-bold text-[#1A1A2E]">{demo.businessName}</p>
              <p className="text-sm text-[#4A5568]">
                AI voice receptionist for {phrase} businesses
              </p>
            </div>
          </div>

          <VoiceDemoClient assistantId={demo.assistantId} businessName={demo.businessName} />
        </div>

        <p className="mx-auto mt-6 max-w-sm text-center text-xs text-[#4A5568]">
          Demo calls are capped at 5 minutes. Nothing you say is used for anything beyond this
          demo.
        </p>
      </main>

      <section className="bg-[#1A1A2E] px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Want one for YOUR business?
          </h2>
          <p className="mt-3 text-base text-white/70">
            Built from your website, customized to your brand, live in 15 minutes.
          </p>
          <a
            href="/builder"
            className="mt-6 inline-block rounded-xl bg-[#0D7377] px-8 py-4 text-base font-bold text-white shadow-lg shadow-[#0D7377]/30 transition hover:bg-[#0A5D61]"
          >
            Build Mine Free
          </a>
        </div>
      </section>

      <footer className="border-t border-[#E2E8F0] bg-white px-6 py-8 text-center">
        <p className="text-sm text-[#4A5568]">
          Built by VestaChatHost ·{" "}
          <a href="https://vestachathost.com" className="text-[#0D7377] hover:text-[#0A5D61]">
            vestachathost.com
          </a>{" "}
          · No obligation
        </p>
      </footer>
    </div>
  );
}
