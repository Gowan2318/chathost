import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  getClientIp,
  isIpBlocked,
  checkRateLimit,
  autoBlockIfAbusive,
} from "../../../lib/rateLimit";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function json(body, init = {}) {
  return NextResponse.json(body, init);
}

// Block loopback, private, and link-local ranges
function isInternalHost(hostname) {
  if (/^(localhost|::1|\[::1\])$/i.test(hostname)) return true;
  if (/^127\./.test(hostname)) return true;
  if (/^10\./.test(hostname)) return true;
  if (/^192\.168\./.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return true;
  if (/^169\.254\./.test(hostname)) return true;
  if (/^0\./.test(hostname)) return true;
  return false;
}

function extractNavLinks(html, baseUrl) {
  const links = [];
  const seen = new Set();
  const re = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    let href = match[1].trim();
    const text = match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!href || !text) continue;
    if (/^(javascript:|mailto:|tel:|#)/i.test(href)) continue;
    try {
      href = new URL(href, baseUrl).href;
    } catch {
      continue;
    }
    if (seen.has(href)) continue;
    seen.add(href);
    links.push(`${text}: ${href}`);
    if (links.length >= 60) break;
  }
  return links;
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const EXTRACTION_PROMPT = `You are extracting business information from a website. Extract ONLY information that is explicitly present in the text or navigation links — do not make anything up or infer details not clearly stated.

Return a JSON object with these fields (use null for any field not found):
{
  "businessName": "string or null",
  "businessDescription": "string (brief description of what the business does, max 500 chars) or null",
  "servicesDescription": "string (list of main services offered, max 300 chars) or null",
  "supportPhone": "string (phone number as it appears on the page, e.g. '(412) 968-0848') or null",
  "supportEmail": "string (email address) or null",
  "websiteUrl": "string (the URL itself) or null",
  "address": {
    "street": "string or null",
    "city": "string or null",
    "state": "string 2-letter abbreviation or null",
    "zip": "string 5-digit zip or null"
  },
  "businessHours": "string (hours of operation if found, as plain text) or null",
  "industry_hint": "string (one of: restaurant, dental, salon, barber, gym, lawncare, realestate, law, other — your best guess based on the content) or null",
  "hasReservations": "true if reservations are offered, false if explicitly not offered, null if unknown",
  "hasDelivery": "true if delivery or takeout is offered, false if explicitly not offered, null if unknown",
  "menuUrl": "string (URL of the online menu page if found) or null"
}

Address extraction rules:
- Look for the address in the footer, contact sections, schema markup, and anywhere on the page
- Common formats: '1337 Old Freeport Road, Pittsburgh, PA 15238' or '1337 Old Freeport Rd, Pittsburgh PA 15238'
- Extract street, city, state abbreviation, and 5-digit zip separately
- If contact page content is provided below, prioritize it for address and phone

Navigation link rules:
- If any link text or URL contains words like 'reservation', 'reserve', 'book a table', 'book now' → set hasReservations: true
- If any link text or URL contains words like 'order online', 'delivery', 'takeout', 'doordash', 'ubereats', 'grubhub', 'order now' → set hasDelivery: true
- If any link text or URL contains 'menu' → set menuUrl to that URL
- Only set hasReservations or hasDelivery to false if the page explicitly states they are NOT offered
- Default to null for these fields when there is no clear evidence either way

Return ONLY valid JSON, no explanation, no markdown.`;

export async function POST(request) {
  try {
    const clientIp = getClientIp(request);

    if (await isIpBlocked(clientIp)) {
      return json({ error: "Access denied" }, { status: 403 });
    }

    // 3 imports per 10 minutes — this hits the Claude API
    const { allowed } = await checkRateLimit(clientIp, "/api/import-website", 3, 600);
    if (!allowed) {
      await autoBlockIfAbusive(clientIp);
      return json(
        { error: "Too many import requests. Please wait 10 minutes and try again." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { url, text: pastedText } = body;

    let content; // plain text to send to Claude

    if (pastedText != null) {
      // Manual paste path — skip fetching entirely
      if (typeof pastedText !== "string") {
        return json({ error: "Invalid text" }, { status: 400 });
      }
      if (pastedText.length > 100000) {
        return json({ error: "Pasted text too long" }, { status: 400 });
      }
      content = stripHtml(pastedText).slice(0, 8000);
      if (content.length < 50) {
        return json({ error: "Please paste more text from your website (at least a few sentences)" }, { status: 400 });
      }
    } else {
      // URL fetch path
      if (!url || typeof url !== "string") {
        return json({ error: "URL is required" }, { status: 400 });
      }
      if (url.length > 500) {
        return json({ error: "URL too long (max 500 characters)" }, { status: 400 });
      }

      let parsed;
      try {
        parsed = new URL(url);
      } catch {
        return json({ error: "Invalid URL format" }, { status: 400 });
      }

      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return json({ error: "URL must use http:// or https://" }, { status: 400 });
      }

      if (isInternalHost(parsed.hostname)) {
        return json({ error: "URL must be a publicly accessible website" }, { status: 400 });
      }

      const fetchHeaders = {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      };

      // Fetch main page and contact page candidates in parallel
      const baseOrigin = `${parsed.protocol}//${parsed.host}`;
      const currentPath = parsed.pathname.replace(/\/$/, "");
      const contactUrls = ["/contact", "/contact-us"]
        .filter((p) => p !== currentPath)
        .map((p) => `${baseOrigin}${p}`);

      const [mainResult, ...contactResults] = await Promise.allSettled([
        fetch(url, { headers: fetchHeaders, signal: AbortSignal.timeout(10000), redirect: "follow" }),
        ...contactUrls.map((cu) =>
          fetch(cu, { headers: fetchHeaders, signal: AbortSignal.timeout(7000), redirect: "follow" })
        ),
      ]);

      if (mainResult.status === "rejected" || !mainResult.value.ok) {
        return json({ error: "Could not reach that website" }, { status: 422 });
      }
      const html = await mainResult.value.text();

      const navLinks = extractNavLinks(html, url);
      console.log("[import-website] nav links found:", navLinks.slice(0, 20));
      content = stripHtml(html).slice(0, 7000);

      if (content.length < 50) {
        return json({ error: "Could not extract readable content from that page" }, { status: 422 });
      }

      if (navLinks.length > 0) {
        content += `\n\nNavigation links found:\n${navLinks.join("\n")}`;
      }

      // Append the first usable contact page as an extra address/phone source
      for (const result of contactResults) {
        if (result.status === "fulfilled" && result.value.ok) {
          try {
            const contactHtml = await result.value.text();
            const contactText = stripHtml(contactHtml).slice(0, 2000);
            if (contactText.length > 50) {
              content += `\n\nContact page content:\n${contactText}`;
            }
          } catch {
            // ignore
          }
          break;
        }
      }
    }

    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `${EXTRACTION_PROMPT}\n\nWebsite text:\n${content}`,
        },
      ],
    });

    const raw = response.content?.[0]?.text ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return json({ error: "Could not parse extracted data" }, { status: 422 });
    }

    let extracted;
    try {
      extracted = JSON.parse(jsonMatch[0]);
    } catch {
      return json({ error: "Could not parse extracted data" }, { status: 422 });
    }

    // Claude occasionally wraps string values in extra quotes — strip them
    for (const key of ["supportPhone", "supportEmail", "businessName", "websiteUrl", "menuUrl", "businessHours"]) {
      if (typeof extracted[key] === "string") {
        extracted[key] = extracted[key].replace(/^["']+|["']+$/g, "").trim() || null;
      }
    }

    // Gym boolean fields can't be inferred from page text or nav links — force null
    // so the bot never falsely claims "no free trial", "no group classes", etc.
    if (extracted.industry_hint === "gym") {
      extracted.hasFreeTrial = null;
      extracted.hasClasses = null;
      extracted.hasTrainers = null;
    }

    console.log("[import-website] extracted:", JSON.stringify(extracted, null, 2));

    return json({ extracted });
  } catch (error) {
    console.error("[api/import-website] error:", error);
    return json({ error: "Import failed. Please try again." }, { status: 500 });
  }
}
