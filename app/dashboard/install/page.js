"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../lib/AuthContext";
import { getSupabaseClient } from "../../../lib/supabase";
import EmbedCodeCard from "../../../components/EmbedCodeCard";
import DashboardSidebar, { Logo, MenuIcon } from "../../../components/dashboard/DashboardSidebar";

const PLATFORMS = [
  {
    name: "WordPress",
    steps: [
      "Go to Appearance → Theme Editor → footer.php and paste the code right before </body>",
      "Or, easier: install the \"Insert Headers and Footers\" plugin and paste the code into the Footer box",
    ],
  },
  {
    name: "Squarespace",
    steps: ["Go to Settings → Advanced → Code Injection → Footer and paste the code there"],
  },
  {
    name: "Wix",
    steps: ["Go to Settings → Custom Code → Add Code, set it to load on all pages, and place it at the end of the Body"],
  },
  {
    name: "Shopify",
    steps: ["Go to Online Store → Themes → Edit Code → theme.liquid and paste the code right before </body>"],
  },
  {
    name: "Webflow",
    steps: ["Go to Project Settings → Custom Code → Footer Code and paste the code there"],
  },
  {
    name: "Plain HTML",
    steps: ["Paste the code directly into your HTML file, right before the closing </body> tag"],
  },
];

function StepNumber({ n }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0D7377] text-sm font-bold text-white">
      {n}
    </span>
  );
}

export default function InstallGuidePage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [chatbot, setChatbot] = useState(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activePlatform, setActivePlatform] = useState(PLATFORMS[0].name);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const supabase = getSupabaseClient();
    supabase
      .from("chatbots")
      .select("client_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        setChatbot(data?.[0] ?? null);
        setFetchLoading(false);
      });
  }, [user]);

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9FA] text-[#4A5568]">
        Loading…
      </div>
    );
  }

  const activeSteps = PLATFORMS.find((p) => p.name === activePlatform)?.steps ?? [];

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <DashboardSidebar email={user.email} onSignOut={handleSignOut} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-60">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-white px-4 py-3 lg:hidden">
          <Logo />
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-[#1A1A2E] hover:bg-[#F8F9FA]"
            aria-label="Open menu"
          >
            <MenuIcon className="h-6 w-6" />
          </button>
        </div>

        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#0D7377]">Install Guide</p>
          <h1 className="mt-1 text-2xl font-bold text-[#1A1A2E] sm:text-3xl">
            Get your chatbot live on your website
          </h1>
          <p className="mt-2 text-sm text-[#4A5568]">
            Four quick steps and your chatbot will be answering customer questions on your site.
          </p>

          {fetchLoading ? (
            <p className="mt-12 text-[#4A5568]">Loading your embed code…</p>
          ) : !chatbot ? (
            <div className="mt-8 rounded-2xl border border-[#E2E8F0] bg-white p-6 text-center shadow-sm">
              <p className="text-[#4A5568]">You haven&apos;t built a chatbot yet.</p>
              <Link
                href="/builder"
                className="mt-4 inline-block rounded-xl bg-[#0D7377] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#0D7377]/20 transition hover:bg-[#0A5D61]"
              >
                Build Your Chatbot
              </Link>
            </div>
          ) : (
            <div className="mt-8 space-y-6">
              {/* Step 1 */}
              <section className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <StepNumber n={1} />
                  <h2 className="text-base font-semibold text-[#1A1A2E]">Copy your embed code</h2>
                </div>
                <div className="mt-5">
                  <EmbedCodeCard clientId={chatbot.client_id} />
                </div>
              </section>

              {/* Step 2 */}
              <section className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <StepNumber n={2} />
                  <h2 className="text-base font-semibold text-[#1A1A2E]">Open your website editor</h2>
                </div>
                <p className="mt-2 ml-11 text-sm text-[#4A5568]">
                  Pick your platform below for exact steps.
                </p>

                <div className="ml-11 mt-5 flex flex-wrap gap-2">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setActivePlatform(p.name)}
                      className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                        activePlatform === p.name
                          ? "bg-[#0D7377] text-white"
                          : "border border-[#E2E8F0] text-[#4A5568] hover:bg-[#F8F9FA]"
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>

                <div className="ml-11 mt-4 rounded-xl border border-[#E2E8F0] bg-[#F8F9FA] p-4">
                  <ul className="space-y-2 text-sm leading-relaxed text-[#4A5568]">
                    {activeSteps.map((step, i) => (
                      <li key={i}>• {step}</li>
                    ))}
                  </ul>
                </div>
              </section>

              {/* Step 3 */}
              <section className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <StepNumber n={3} />
                  <h2 className="text-base font-semibold text-[#1A1A2E]">Test it</h2>
                </div>
                <p className="ml-11 mt-2 text-sm leading-relaxed text-[#4A5568]">
                  Visit your website and look for the chat bubble in the bottom-right corner. Click
                  it and send a test message to make sure your chatbot responds.
                </p>
              </section>

              {/* Step 4 */}
              <section className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <StepNumber n={4} />
                  <h2 className="text-base font-semibold text-[#1A1A2E]">Customize</h2>
                </div>
                <p className="ml-11 mt-2 text-sm leading-relaxed text-[#4A5568]">
                  Update your business info, branding, quick replies, and mascot anytime from Edit Bot.
                </p>
                <Link
                  href="/dashboard/edit"
                  className="ml-11 mt-4 inline-block rounded-xl border border-[#0D7377]/40 px-5 py-2.5 text-sm font-semibold text-[#0D7377] transition hover:bg-[#0D7377]/10"
                >
                  Go to Edit Bot
                </Link>
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
