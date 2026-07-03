import { Resend } from "resend";

const FROM_ADDRESS = "VestaChatHost <noreply@vestachathost.com>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://vestachathost.com";
const FOUNDER_EMAIL = "gowanareb46+vesta3@gmail.com";
const SUPABASE_TABLE_URL = "https://supabase.com/dashboard/project/gfhewllcglcutuejyomc/editor";
const STRIPE_DASHBOARD_URL = "https://dashboard.stripe.com/customers";
const PLAN_PRICE = { basic: "$40/mo", pro: "$60/mo" };

function resendClient() {
  return new Resend(process.env.RESEND_API_KEY);
}

async function sendEmail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY || !to) return;
  try {
    await resendClient().emails.send({ from: FROM_ADDRESS, to, subject, html });
  } catch (err) {
    console.error("[lib/email] send failed:", err);
  }
}

function emailShell(bodyHtml) {
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1A202C;">
  <div style="font-size: 20px; font-weight: 700; color: #0D7377; margin-bottom: 24px;">VestaChatHost</div>
  ${bodyHtml}
  <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 32px 0 16px;" />
  <p style="font-size: 12px; color: #718096;">
    Questions? Reply to this email or contact
    <a href="mailto:support@vestachathost.com" style="color: #0D7377;">support@vestachathost.com</a>.
  </p>
</div>`.trim();
}

function button(href, label) {
  return `<a href="${href}" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #0D7377; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">${label}</a>`;
}

function infoRow(label, value) {
  return `<tr><td style="padding: 6px 0; color: #718096;">${label}</td><td style="padding: 6px 0; font-weight: 600; color: #1A202C;">${value}</td></tr>`;
}

function infoTable(rows) {
  return `<table style="width: 100%; font-size: 14px; border-collapse: collapse; margin-top: 16px;">${rows.join("")}</table>`;
}

function formatTimestamp() {
  return `${new Date().toLocaleString("en-US", {
    timeZone: "UTC",
    dateStyle: "medium",
    timeStyle: "short",
  })} UTC`;
}

export async function sendUsageWarningEmail({ ownerEmail, businessName, plan, used, limit, resetDate }) {
  const isBasic = plan !== "pro";

  const html = emailShell(`
    <p style="font-size: 16px;">Hi there,</p>
    <p style="font-size: 16px; line-height: 1.6;">
      Your chatbot for <strong>${businessName}</strong> has used <strong>${used} of ${limit}</strong>
      messages this month — that's 80% of your ${isBasic ? "Basic" : "Pro"} plan limit.
    </p>
    <p style="font-size: 16px; line-height: 1.6;">
      Your message count resets on <strong>${resetDate}</strong>. Once the limit is reached, your
      chatbot will pause and stop responding to customers until then.
    </p>
    ${isBasic
      ? `<p style="font-size: 16px; line-height: 1.6;">Upgrade to Pro for 1,500 messages/month so you never miss a customer conversation.</p>${button(`${SITE_URL}/dashboard`, "Upgrade to Pro")}`
      : button(`${SITE_URL}/dashboard`, "View your dashboard")
    }
  `);

  await sendEmail({
    to: ownerEmail,
    subject: "⚠️ Your chatbot is at 80% of its monthly limit",
    html,
  });
}

export async function sendLimitReachedEmail({ ownerEmail, businessName, plan, limit, resetDate }) {
  const isBasic = plan !== "pro";

  const html = emailShell(`
    <p style="font-size: 16px;">Hi there,</p>
    <p style="font-size: 16px; line-height: 1.6;">
      Your chatbot for <strong>${businessName}</strong> has reached its monthly limit of
      <strong>${limit} messages</strong>. It's now paused and won't respond to new customer
      messages until it resets on <strong>${resetDate}</strong>.
    </p>
    ${isBasic
      ? `<p style="font-size: 16px; line-height: 1.6;">Want your chatbot back online right away? Upgrade to Pro for 1,500 messages/month.</p>${button(`${SITE_URL}/dashboard`, "Upgrade to Pro")}`
      : `<p style="font-size: 16px; line-height: 1.6;">You can check your usage anytime from your dashboard.</p>${button(`${SITE_URL}/dashboard`, "View your dashboard")}`
    }
  `);

  await sendEmail({
    to: ownerEmail,
    subject: "🚫 Your chatbot has reached its monthly message limit",
    html,
  });
}

export async function sendOnboardingEmail({ ownerEmail, businessName, plan, clientId }) {
  const isPro = plan === "pro";
  const limit = isPro ? 1500 : 500;

  const html = emailShell(`
    <p style="font-size: 16px;">Hi there,</p>
    <p style="font-size: 16px; line-height: 1.6;">
      🎉 Congratulations — your chatbot for <strong>${businessName}</strong> is ready to go! Thanks
      for choosing VestaChatHost.
    </p>
    <p style="font-size: 16px; line-height: 1.6;">
      You're on the <strong>${isPro ? "Pro" : "Basic"}</strong> plan, which includes up to
      <strong>${limit.toLocaleString()} messages/month</strong>.
    </p>
    <p style="font-size: 16px; line-height: 1.6; font-weight: 600; margin-bottom: 8px;">Getting started in 3 steps:</p>
    <ol style="font-size: 16px; line-height: 1.8; padding-left: 20px; margin-top: 0;">
      <li>Go to your dashboard and find your embed code.</li>
      <li>Paste the embed code on your website, right before the closing <code>&lt;/body&gt;</code> tag.</li>
      <li>Test your chatbot and customize it anytime from the dashboard.</li>
    </ol>
    ${button(`${SITE_URL}/dashboard`, "Go to your dashboard")}
    <p style="font-size: 16px; line-height: 1.6; margin-top: 24px;">
      Need a hand? Reach us anytime at
      <a href="mailto:support@vestachathost.com" style="color: #0D7377;">support@vestachathost.com</a>.
    </p>
    <p style="font-size: 16px; line-height: 1.6;">Welcome aboard!<br />The VestaChatHost Team</p>
    <p style="font-size: 12px; color: #A0AEC0; margin-top: 24px;">Chatbot ID: ${clientId}</p>
  `);

  await sendEmail({
    to: ownerEmail,
    subject: "🎉 Welcome to VestaChatHost — Your chatbot is ready!",
    html,
  });
}

export async function sendNewSignupNotification({ ownerEmail, businessName, plan, clientId }) {
  const planLabel = plan === "pro" ? "Pro" : "Basic";
  const amount = PLAN_PRICE[plan] ?? "—";

  const html = emailShell(`
    <p style="font-size: 16px;">🎉 A new customer just signed up!</p>
    ${infoTable([
      infoRow("Business", businessName),
      infoRow("Owner email", ownerEmail),
      infoRow("Plan", `${planLabel} (${amount})`),
      infoRow("Client ID", clientId),
      infoRow("Time", formatTimestamp()),
    ])}
    ${button(SUPABASE_TABLE_URL, "View in Supabase")}
  `);

  await sendEmail({
    to: FOUNDER_EMAIL,
    subject: "🎉 New VestaChatHost customer signed up!",
    html,
  });
}

export async function sendPaymentFailedNotification({ ownerEmail, businessName, plan, clientId, failureReason }) {
  const planLabel = plan === "pro" ? "Pro" : plan === "basic" ? "Basic" : "—";

  const rows = [
    infoRow("Business", businessName),
    infoRow("Owner email", ownerEmail),
    infoRow("Plan", planLabel),
    infoRow("Client ID", clientId),
  ];
  if (failureReason) rows.push(infoRow("Reason", failureReason));
  rows.push(infoRow("Time", formatTimestamp()));

  const html = emailShell(`
    <p style="font-size: 16px; font-weight: 600; color: #C53030;">⚠️ A customer's payment failed and needs attention.</p>
    ${infoTable(rows)}
    ${button(STRIPE_DASHBOARD_URL, "View in Stripe")}
  `);

  await sendEmail({
    to: FOUNDER_EMAIL,
    subject: "⚠️ Payment failed — VestaChatHost customer needs attention",
    html,
  });
}
