import { Resend } from "resend";

const FROM_ADDRESS = "VestaChatHost <noreply@vestachathost.com>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://vestachathost.com";

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
