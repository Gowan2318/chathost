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

const BOOKING_DOMAINS = [
  "calendly.com", "square.com", "squareup.com", "booksy.com", "vagaro.com",
  "mindbodyonline.com", "acuityscheduling.com", "appointmentplus.com",
  "setmore.com", "fresha.com", "boulevard.io", "gloss.app", "styleseat.com",
];
const PAYMENT_DOMAINS = [
  "paypal.com", "paypal.me", "venmo.com", "cash.app", "cashapp.com",
  "stripe.com", "buy.stripe.com", "zelle.com",
];
const SOCIAL_DOMAINS = [
  "instagram.com", "facebook.com", "tiktok.com", "twitter.com", "x.com",
  "youtube.com", "linkedin.com", "pinterest.com",
];
const SOCIAL_KEY_MAP = {
  "instagram.com": "instagram",
  "facebook.com": "facebook",
  "tiktok.com": "tiktok",
};
const MENU_PATTERNS = ["/menu", "/our-menu", "/food", "/drinks"];
const SERVICE_PATTERNS = ["/services", "/treatments", "/what-we-do", "/offerings", "/work", "/portfolio"];
const PROMO_PATTERNS = ["/specials", "/promotions", "/deals", "/offers", "/events", "/whats-on"];

function domainMatches(hostname, domain) {
  const bare = hostname.replace(/^www\./, "");
  return bare === domain || bare.endsWith("." + domain);
}

function extractUrlObjects(text, baseUrl) {
  const seen = new Set();
  const result = [];
  const mdRe = /\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g;
  const bareRe = /\bhttps?:\/\/[^\s<>"')\]]+/g;
  for (const re of [mdRe, bareRe]) {
    let m;
    while ((m = re.exec(text)) !== null) {
      const raw = (m[1] || m[0]).split(" ")[0];
      if (seen.has(raw)) continue;
      seen.add(raw);
      try { result.push(new URL(raw)); } catch {}
    }
  }
  return result;
}

function categorizeLinks(urlObjects, baseHostname) {
  let bookingUrl = null;
  let payNowUrl = null;
  const socialLinks = { instagram: null, facebook: null, tiktok: null, other: [] };
  const pagesToScrape = new Set();
  let linktreeUrl = null;
  const bareBase = baseHostname.replace(/^www\./, "");

  for (const url of urlObjects) {
    const bare = url.hostname.replace(/^www\./, "");
    const path = url.pathname.toLowerCase();

    if (bare === "linktr.ee") {
      if (!linktreeUrl) linktreeUrl = url.href;
      continue;
    }

    if (!bookingUrl && BOOKING_DOMAINS.some(d => domainMatches(url.hostname, d))) {
      bookingUrl = url.href;
      continue;
    }
    if (!payNowUrl && PAYMENT_DOMAINS.some(d => domainMatches(url.hostname, d))) {
      payNowUrl = url.href;
      continue;
    }

    const socialDomain = SOCIAL_DOMAINS.find(d => domainMatches(url.hostname, d));
    if (socialDomain) {
      const key = SOCIAL_KEY_MAP[socialDomain] || null;
      if (key && !socialLinks[key]) {
        socialLinks[key] = url.href;
      } else if (!key && !socialLinks.other.includes(url.href)) {
        socialLinks.other.push(url.href);
      }
      continue;
    }

    if (bare === bareBase) {
      const match =
        SERVICE_PATTERNS.some(p => path === p || path.startsWith(p + "/")) ||
        PROMO_PATTERNS.some(p => path === p || path.startsWith(p + "/")) ||
        MENU_PATTERNS.some(p => path === p || path.startsWith(p + "/"));
      if (match) pagesToScrape.add(url.href);
    }
  }

  return { bookingUrl, payNowUrl, socialLinks, pagesToScrape: [...pagesToScrape], linktreeUrl };
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
    try { href = new URL(href, baseUrl).href; } catch { continue; }
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

async function firecrawlScrape(url, apiKey, timeoutMs = 12000) {
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return "";
    const data = await res.json();
    return data.data?.markdown || "";
  } catch {
    return "";
  }
}

// Emails to treat as fake/placeholder and never surface
const PLACEHOLDER_EMAIL_RE = /^(noreply|no-reply|donotreply|notifications?|mailer-daemon|postmaster|bounce)@/i;
const FAKE_EMAIL_DOMAIN_RE = /@(example\.com|yourbusiness\.com|yourcompany\.com|yourdomain\.com|test\.com|domain\.com)$/i;
const PLACEHOLDER_EMAILS = new Set([
  "support@yourbusiness.com", "hello@yourbusiness.com", "email@yourbusiness.com",
  "contact@yourbusiness.com", "info@example.com", "name@example.com", "user@example.com",
  "example@email.com",
]);

function isRealEmail(email) {
  if (!email || typeof email !== "string") return false;
  const lower = email.toLowerCase();
  return (
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) &&
    !PLACEHOLDER_EMAILS.has(lower) &&
    !PLACEHOLDER_EMAIL_RE.test(lower) &&
    !FAKE_EMAIL_DOMAIN_RE.test(lower) &&
    email.length <= 254
  );
}

const HOURS_PARSE_PROMPT = `Parse business hours text into a structured JSON object.

Return an object with exactly these 7 keys: monday tuesday wednesday thursday friday saturday sunday.
Each value must be: { "open": boolean, "openTime": "HH:MM", "closeTime": "HH:MM" } using 24-hour time.

Rules:
- Ranges like "Mon-Fri" or "Monday through Friday" = all those days open
- "Closed" or "closed" → open: false
- "By appointment" → open: true, use 09:00/17:00
- Time conversion: "9am"→"09:00", "5pm"→"17:00", "5:30pm"→"17:30", "12pm"→"12:00", "12am"→"00:00"
- Round times to nearest half-hour (e.g. 9:15→09:00, 9:20→09:30)
- If a day is not mentioned, assume closed
- Closed days: set open: false, keep openTime "09:00" closeTime "17:00" as placeholders

Return ONLY valid JSON, no explanation.`;

async function parseHoursText(hoursText) {
  try {
    const resp = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [{ role: "user", content: `${HOURS_PARSE_PROMPT}\n\nHours text: "${hoursText}"` }],
    });
    const raw = resp.content?.[0]?.text ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    if (!DAYS.every(d => parsed[d] && typeof parsed[d].open === "boolean")) return null;
    // Ensure times are valid HH:MM and snap to 30-min grid
    for (const day of DAYS) {
      const slot = parsed[day];
      slot.openTime = snapTime(slot.openTime) || "09:00";
      slot.closeTime = snapTime(slot.closeTime) || "17:00";
    }
    return parsed;
  } catch {
    return null;
  }
}

function snapTime(t) {
  if (!/^\d{2}:\d{2}$/.test(t)) return null;
  const [h, m] = t.split(":").map(Number);
  if (h > 23 || m > 59) return null;
  const snappedM = m < 15 ? 0 : m < 45 ? 30 : 0;
  const snappedH = m >= 45 ? (h + 1) % 24 : h;
  return `${String(snappedH).padStart(2, "0")}:${String(snappedM).padStart(2, "0")}`;
}

const EXTRACTION_PROMPT = `You are extracting business information from website content. Extract ONLY information explicitly present — do not invent or infer details.

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
  "industry_hint": "string (one of: restaurant, dental, salon, barber, gym, lawncare, realestate, law, other) or null",
  "hasReservations": true/false/null,
  "hasDelivery": true/false/null,
  "menuUrl": "string (URL of online menu if found) or null",
  "bookingUrl": "string (URL of a booking or scheduling page visible in content, e.g. a calendly or square link) or null",
  "payNowUrl": "string (URL of a payment page visible in content) or null",
  "promotions": "string (any current deals, specials, discounts, or promotions mentioned, max 500 chars) or null",
  "upcomingEvents": "string (any upcoming events, classes, or special dates mentioned, max 500 chars) or null",
  "websiteKnowledge": "string (comprehensive knowledge base summary — services, pricing, policies, specialties, unique offerings, team, FAQ-style info; max 2000 chars) or null"
}

Address rules: look in footer, contact sections, schema markup. Extract street/city/state/zip separately.
hasReservations/hasDelivery: true only if explicitly offered, false only if explicitly NOT offered, null otherwise.
websiteKnowledge: write as a rich paragraph the bot can draw on to answer any customer question. Include all useful details from all pages provided.

Return ONLY valid JSON, no explanation, no markdown.`;

export async function POST(request) {
  try {
    const clientIp = getClientIp(request);
    console.log("[import-website] POST received, ip:", clientIp);

    if (await isIpBlocked(clientIp)) {
      return json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const { url, text: pastedText } = body;

    // ── parseHours sub-request (lightweight follow-up from handleImport) ─
    if (body.parseHours) {
      const { hoursText } = body;
      if (!hoursText || typeof hoursText !== "string" || hoursText.length > 500) {
        return json({ error: "Invalid hoursText" }, { status: 400 });
      }
      const { allowed } = await checkRateLimit(clientIp, "/api/import-website/parse-hours", 10, 600);
      if (!allowed) return json({ error: "Too many requests" }, { status: 429 });
      const parsedHours = await parseHoursText(hoursText);
      return json({ parsedHours: parsedHours ?? null });
    }

    console.log("[import-website] received:", { hasUrl: !!url, hasText: !!pastedText, textLength: pastedText?.length });

    const isPaste = pastedText != null;
    const rateLimitRoute = isPaste ? "/api/import-website/paste" : "/api/import-website/url";
    const rateLimitMax = isPaste ? 10 : 3;
    const { allowed } = await checkRateLimit(clientIp, rateLimitRoute, rateLimitMax, 600);
    if (!allowed) {
      await autoBlockIfAbusive(clientIp);
      return json({
        error: isPaste
          ? "Too many paste imports. Please wait 10 minutes and try again."
          : "Too many import requests. Please wait 10 minutes and try again.",
      }, { status: 429 });
    }

    let content;
    let cat = null; // link categorization result

    if (isPaste) {
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
      // ── URL path ──────────────────────────────────────────────────────
      if (!url || typeof url !== "string") {
        return json({ error: "URL is required" }, { status: 400 });
      }
      if (url.length > 500) {
        return json({ error: "URL too long (max 500 characters)" }, { status: 400 });
      }

      let parsed;
      try { parsed = new URL(url); } catch {
        return json({ error: "Invalid URL format" }, { status: 400 });
      }
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return json({ error: "URL must use http:// or https://" }, { status: 400 });
      }
      if (isInternalHost(parsed.hostname)) {
        return json({ error: "URL must be a publicly accessible website" }, { status: 400 });
      }

      const fetchHeaders = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      };

      if (process.env.FIRECRAWL_API_KEY) {
        // ── Firecrawl path ───────────────────────────────────────────────
        console.log("[firecrawl] scraping main page:", url);
        const mainMd = await firecrawlScrape(url, process.env.FIRECRAWL_API_KEY, 15000);
        console.log("[firecrawl] main page content length:", mainMd.length);

        if (mainMd.length < 100) {
          return json({ error: "Could not extract readable content from that page" }, { status: 422 });
        }

        // Categorize all links found on the main page
        const urlObjects = extractUrlObjects(mainMd, url);
        cat = categorizeLinks(urlObjects, parsed.hostname);
        console.log("[import] link categorization:", {
          bookingUrl: cat.bookingUrl,
          payNowUrl: cat.payNowUrl,
          socialLinks: cat.socialLinks,
          pagesToScrape: cat.pagesToScrape,
          linktreeUrl: cat.linktreeUrl,
        });

        // Build scrape queue: priority pages + /about + /contact (max 4 total)
        const baseOrigin = `${parsed.protocol}//${parsed.host}`;
        const currentPath = parsed.pathname.replace(/\/$/, "");
        const scrapeQueue = [];

        // 1. Service/promo/menu pages (up to 2)
        for (const p of cat.pagesToScrape.slice(0, 2)) {
          scrapeQueue.push(p);
        }
        // 2. Linktree (if found)
        if (cat.linktreeUrl && scrapeQueue.length < 4) {
          scrapeQueue.push(cat.linktreeUrl);
        }
        // 3. /contact and /about
        for (const path of ["/contact", "/contact-us", "/about"]) {
          if (scrapeQueue.length >= 4) break;
          const pageUrl = `${baseOrigin}${path}`;
          if (path !== currentPath && !scrapeQueue.includes(pageUrl)) {
            scrapeQueue.push(pageUrl);
          }
        }

        console.log("[import] scraping additional pages:", scrapeQueue);

        const additionalResults = await Promise.allSettled(
          scrapeQueue.map(pageUrl => firecrawlScrape(pageUrl, process.env.FIRECRAWL_API_KEY, 10000))
        );

        // Combine all content, max 12000 chars
        let combined = mainMd.slice(0, 9000);

        for (let i = 0; i < additionalResults.length; i++) {
          if (additionalResults[i].status !== "fulfilled") continue;
          const pageMd = additionalResults[i].value;
          if (!pageMd || pageMd.length < 50) continue;

          // If this is the linktree page, mine it for more booking/social/payment links
          if (cat.linktreeUrl && scrapeQueue[i] === cat.linktreeUrl) {
            const ltUrls = extractUrlObjects(pageMd, cat.linktreeUrl);
            for (const ltu of ltUrls) {
              if (!cat.bookingUrl && BOOKING_DOMAINS.some(d => domainMatches(ltu.hostname, d))) {
                cat.bookingUrl = ltu.href;
              }
              if (!cat.payNowUrl && PAYMENT_DOMAINS.some(d => domainMatches(ltu.hostname, d))) {
                cat.payNowUrl = ltu.href;
              }
              const socialDomain = SOCIAL_DOMAINS.find(d => domainMatches(ltu.hostname, d));
              if (socialDomain) {
                const key = SOCIAL_KEY_MAP[socialDomain] || null;
                if (key && !cat.socialLinks[key]) {
                  cat.socialLinks[key] = ltu.href;
                } else if (!key && !cat.socialLinks.other.includes(ltu.href)) {
                  cat.socialLinks.other.push(ltu.href);
                }
              }
            }
          }

          const available = 12000 - combined.length;
          if (available <= 100) break;
          combined += `\n\n---\n${pageMd.slice(0, Math.min(available, 2500))}`;
        }

        content = combined;
        console.log("[firecrawl] combined content length:", content.length);
      } else {
        // ── Basic fetch fallback ─────────────────────────────────────────
        console.log("[import] no Firecrawl — basic fetch");
        const baseOrigin = `${parsed.protocol}//${parsed.host}`;
        const currentPath = parsed.pathname.replace(/\/$/, "");
        const contactUrls = ["/contact", "/contact-us"]
          .filter(p => p !== currentPath)
          .map(p => `${baseOrigin}${p}`);

        const [mainResult, ...contactResults] = await Promise.allSettled([
          fetch(url, { headers: fetchHeaders, signal: AbortSignal.timeout(10000), redirect: "follow" }),
          ...contactUrls.map(cu => fetch(cu, { headers: fetchHeaders, signal: AbortSignal.timeout(7000), redirect: "follow" })),
        ]);

        if (mainResult.status === "rejected" || !mainResult.value.ok) {
          return json({ error: "Could not reach that website" }, { status: 422 });
        }
        const html = await mainResult.value.text();

        const navLinks = extractNavLinks(html, url);
        console.log("[import] nav links found:", navLinks.slice(0, 20));

        // Categorize links from the HTML
        const urlObjects = extractUrlObjects(html, url);
        cat = categorizeLinks(urlObjects, parsed.hostname);

        content = stripHtml(html).slice(0, 7000);
        if (content.length < 50) {
          return json({ error: "Could not extract readable content from that page" }, { status: 422 });
        }
        if (navLinks.length > 0) {
          content += `\n\nNavigation links found:\n${navLinks.join("\n")}`;
        }

        for (const result of contactResults) {
          if (result.status === "fulfilled" && result.value.ok) {
            try {
              const contactHtml = await result.value.text();
              const contactText = stripHtml(contactHtml).slice(0, 2000);
              if (contactText.length > 50) {
                content += `\n\nContact page content:\n${contactText}`;
              }
            } catch {}
            break;
          }
        }
      }
    }

    // ── Claude extraction ─────────────────────────────────────────────────
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{ role: "user", content: `${EXTRACTION_PROMPT}\n\nWebsite content:\n${content}` }],
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

    // Strip extra quotes from string fields
    for (const key of ["supportPhone", "supportEmail", "businessName", "websiteUrl", "menuUrl", "businessHours", "bookingUrl", "payNowUrl"]) {
      if (typeof extracted[key] === "string") {
        extracted[key] = extracted[key].replace(/^["']+|["']+$/g, "").trim() || null;
      }
    }

    // Enforce field length limits
    if (typeof extracted.businessName === "string" && extracted.businessName.length > 100) {
      extracted.businessName = extracted.businessName.slice(0, 100);
    }
    if (typeof extracted.businessDescription === "string" && extracted.businessDescription.length > 500) {
      extracted.businessDescription = extracted.businessDescription.slice(0, 497) + "...";
    }
    if (typeof extracted.servicesDescription === "string" && extracted.servicesDescription.length > 300) {
      extracted.servicesDescription = extracted.servicesDescription.slice(0, 297) + "...";
    }
    if (typeof extracted.promotions === "string" && extracted.promotions.length > 1000) {
      extracted.promotions = extracted.promotions.slice(0, 997) + "...";
    }
    if (typeof extracted.upcomingEvents === "string" && extracted.upcomingEvents.length > 1000) {
      extracted.upcomingEvents = extracted.upcomingEvents.slice(0, 997) + "...";
    }
    if (typeof extracted.websiteKnowledge === "string" && extracted.websiteKnowledge.length > 2000) {
      extracted.websiteKnowledge = extracted.websiteKnowledge.slice(0, 1997) + "...";
    }

    if (extracted.industry_hint === "gym") {
      extracted.hasFreeTrial = null;
      extracted.hasClasses = null;
      extracted.hasTrainers = null;
    }

    // ── Email: validate Claude's result; fallback to regex scan of content ─
    if (!isRealEmail(extracted.supportEmail)) {
      extracted.supportEmail = null;
      const EMAIL_SCAN_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const candidates = content.match(EMAIL_SCAN_RE) || [];
      for (const candidate of candidates) {
        if (isRealEmail(candidate)) {
          extracted.supportEmail = candidate;
          console.log("[import] email fallback found:", candidate);
          break;
        }
      }
    }

    // ── Merge link categorization results (takes priority over Claude) ────
    const toHttps = (u) => (typeof u === "string" ? u.replace(/^http:\/\//, "https://") : u);

    if (cat) {
      if (cat.bookingUrl) extracted.bookingUrl = toHttps(cat.bookingUrl);
      if (cat.payNowUrl) extracted.payNowUrl = toHttps(cat.payNowUrl);

      const { socialLinks } = cat;
      const hasSocial = socialLinks.instagram || socialLinks.facebook || socialLinks.tiktok || socialLinks.other.length > 0;
      extracted.socialLinks = hasSocial ? socialLinks : null;
    } else {
      extracted.socialLinks = null;
    }

    // Upgrade any remaining http:// URLs to https://
    for (const key of ["bookingUrl", "payNowUrl", "menuUrl", "websiteUrl"]) {
      if (extracted[key]) extracted[key] = toHttps(extracted[key]);
    }

    console.log("[import-website] extracted:", JSON.stringify(extracted, null, 2));
    return json({ extracted });
  } catch (error) {
    console.error("[api/import-website] error:", error);
    return json({ error: "Import failed. Please try again." }, { status: 500 });
  }
}
