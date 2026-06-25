(function () {
  "use strict";

  var BOOKING_PATTERN =
    /\b(book|booking|schedule|appointment|reserve|make an appointment)\b/i;
  var PAYMENT_PATTERN =
    /\b(pay|payment|pricing|price|prices|cost|costs|how much|how to pay|fee|fees|quote)\b/i;
  var TALK_TO_SOMEONE_PATTERN = /\btalk to someone\b/i;
  var SERVICES_TOPIC_RESP = /\b(service|offer|provide|specialize|treatment|plan|package|include)\b/i;
  var ACCEPTING_PATIENTS_PATTERN = /\b(accepting new patients|currently accepting)\b/i;
  var AFFIRMATIVE_PATTERN = /^(yes|yeah|yep|sure|ok|okay|please|definitely|absolutely)\.?$/i;
  var CONVERSATION_END_PATTERN = /Is there anything else|anything else I can|else I can help|help you with|Have a great day|Feel free to reach out|Hope that helps/i;
  var MASCOT_SRC = {
    dental: "/mascots/dental.png",
    gym: "/mascots/gym.png",
    salon: "/mascots/salon.png",
    restaurant: "/mascots/restaurant.png",
    real_estate: "/mascots/realestate.png",
    law: "/mascots/law.png",
    barber: "/mascots/barber.png",
    lawn: "/mascots/lawncare.png",
    other: "/mascots/other.png",
  };

  var THEMES = {
    light: {
      chatBackground: "#ffffff",
      botBubble: "#f3f4f6",
      botText: "#374151",
      inputBackground: "#ffffff",
      inputText: "#1f2937",
      panelBorder: "#e5e7eb",
      messagesArea: "#f8fafc",
      footerBackground: "#ffffff",
      footerBorder: "#f3f4f6",
      quickReplyBackground: "#ffffff",
      secondaryButtonBg: "#f8fafc",
      secondaryButtonText: "#475569",
      secondaryButtonBorder: "#e2e8f0",
    },
    dark: {
      chatBackground: "#1A1A1A",
      botBubble: "#2A2A2A",
      botText: "#ffffff",
      inputBackground: "#111111",
      inputText: "#ffffff",
      panelBorder: "#333333",
      messagesArea: "#1A1A1A",
      footerBackground: "#1A1A1A",
      footerBorder: "#2A2A2A",
      quickReplyBackground: "#1A1A1A",
      secondaryButtonBg: "#2A2A2A",
      secondaryButtonText: "#d1d5db",
      secondaryButtonBorder: "#404040",
    },
  };

  function shadeHex(hex, percent) {
    var n = String(hex || "").replace("#", "");
    if (n.length !== 6) return hex || "#D4AF37";
    var num = parseInt(n, 16);
    var r = Math.min(255, Math.max(0, ((num >> 16) & 255) + percent));
    var g = Math.min(255, Math.max(0, ((num >> 8) & 255) + percent));
    var b = Math.min(255, Math.max(0, (num & 255) + percent));
    return (
      "#" +
      ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
    );
  }

  function resolveTheme(themeId, brandColor) {
    var base = THEMES[themeId] || THEMES.light;
    return {
      chatBackground: base.chatBackground,
      botBubble: base.botBubble,
      botText: base.botText,
      inputBackground: base.inputBackground,
      inputText: base.inputText,
      panelBorder: base.panelBorder,
      messagesArea: base.messagesArea,
      footerBackground: base.footerBackground,
      footerBorder: base.footerBorder,
      quickReplyBackground: base.quickReplyBackground,
      secondaryButtonBg: base.secondaryButtonBg,
      secondaryButtonText: base.secondaryButtonText,
      secondaryButtonBorder: base.secondaryButtonBorder,
      userBubble: brandColor,
      userText: "#ffffff",
    };
  }

  function getScriptInfo() {
    var script = document.currentScript;
    if (!script) {
      var scripts = document.getElementsByTagName("script");
      for (var i = scripts.length - 1; i >= 0; i--) {
        if (/widget\.js/i.test(scripts[i].src || "")) {
          script = scripts[i];
          break;
        }
      }
    }
    if (!script || !script.src) return null;
    try {
      var url = new URL(script.src);
      var id = url.searchParams.get("id");
      if (!id) return null;
      return { id: id, baseUrl: url.origin };
    } catch (e) {
      return null;
    }
  }

  function toApiMessages(messages) {
    var normalized = (messages || [])
      .filter(function (msg) {
        return msg && (msg.role === "user" || msg.role === "assistant");
      })
      .map(function (msg) {
        return { role: msg.role, content: String(msg.content || "") };
      })
      .filter(function (msg) {
        return msg.content.length > 0;
      });

    var start = 0;
    while (start < normalized.length && normalized[start].role === "assistant") {
      start += 1;
    }
    return normalized.slice(start);
  }

  function isBookingIntent(text) {
    return BOOKING_PATTERN.test(text);
  }

  function isPaymentIntent(text) {
    return PAYMENT_PATTERN.test(text);
  }

  function isTalkToSomeoneIntent(text) {
    return TALK_TO_SOMEONE_PATTERN.test(text);
  }

  function lastBotWasFollowUp(messages) {
    for (var i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") {
        return CONVERSATION_END_PATTERN.test(String(messages[i].content || ""));
      }
    }
    return false;
  }

  function createWidget(config, baseUrl) {
    var businessName = config.businessName || "Your Business";
    var businessInfo = config.businessInfo || "";
    var supportPhone = config.supportPhone || "";
    var supportEmail = config.supportEmail || "";
    var payNowUrl = config.payNowUrl || "";
    var bookingUrl = config.booking_url || config.bookingUrl || "";
    var quickReplies = (config.quickReplies || []).filter(Boolean);
    var customQA = Array.isArray(config.customQA) ? config.customQA : [];
    var qaAnswerMap = {};
    customQA.forEach(function (qa) {
      if (qa && qa.question && qa.question.trim() && qa.answer && qa.answer.trim()) {
        qaAnswerMap[qa.question.trim().toLowerCase()] = qa.answer.trim();
      }
    });
    var allButtons = quickReplies.concat(
      customQA
        .filter(function (qa) { return qa && qa.question && qa.question.trim(); })
        .map(function (qa) { return qa.question.trim(); })
    ).slice(0, 8);
    var brandColor = config.brandColor || "#D4AF37";
    var brandDark = shadeHex(brandColor, -25);
    var theme = resolveTheme(config.chatTheme || "light", brandColor);
    var industry = config.mascotIndustry || config.industry || "other";
    var mascotName = config.mascotName || "";
    var displayMascotName = mascotName || businessName;
    var mascotUrl = baseUrl + (MASCOT_SRC[industry] || MASCOT_SRC.other);

    var pricingInfo =
      config.pricingInfo ||
      "Here's how our pricing works:\n\nContact " +
        businessName +
        " for current rates and packages.\n\nYou can pay securely online when you're ready.";

    function supportMessage() {
      return (
        "I want to make sure you get the best help! Please contact our team directly:\n" +
        "\uD83D\uDCDE " +
        supportPhone +
        "\n" +
        "\uD83D\uDCE7 " +
        supportEmail +
        "\nWe're happy to assist you!"
      );
    }

    function buildContextualReplies(botText) {
      if (ACCEPTING_PATIENTS_PATTERN.test(botText)) {
        return ["Book an appointment"];
      }
      if (/\b(book|appointment)\b/i.test(botText) && /https?:\/\//.test(botText)) {
        return ["Yes, book now"];
      }
      var pool = [];
      if (SERVICES_TOPIC_RESP.test(botText)) {
        pool.push("What are your prices?");
      }
      if (bookingUrl) {
        pool.push("Book an appointment");
      }
      if (supportPhone || supportEmail) {
        pool.push("Talk to someone");
      }
      return pool.slice(0, 3);
    }

    var INDUSTRY_EXAMPLES = {
      restaurant: "'What\u2019s on your menu?' or 'Do you take reservations?'",
      dental: "'Are you accepting new patients?' or 'What insurance do you accept?'",
      salon: "'What services do you offer?' or 'Do you accept walk-ins?'",
      barber: "'What are your prices?' or 'Do you accept walk-ins?'",
      gym: "'What are your membership options?' or 'Do you offer a free trial?'",
      lawncare: "'Do you offer free estimates?' or 'What areas do you service?'",
      lawn: "'Do you offer free estimates?' or 'What areas do you service?'",
      realestate: "'What areas do you serve?' or 'Are you accepting new clients?'",
      real_estate: "'What areas do you serve?' or 'Are you accepting new clients?'",
      law: "'What areas of law do you practice?' or 'Do you offer free consultations?'",
    };
    var industryExamples = INDUSTRY_EXAMPLES[industry] || "'What services do you offer?' or 'How do I get in touch?'";
    var welcomeMessage = {
      role: "assistant",
      content:
        "Hi! I\u2019m " + displayMascotName + ", and I\u2019m here to answer all your questions about " +
        businessName + ". Feel free to ask me anything \u2014 for example, " +
        industryExamples + ". What would you like to know? \uD83D\uDE0A",
    };

    var state = {
      isOpen: false,
      messages: [welcomeMessage],
      input: "",
      isTyping: false,
      showQuickReplies: true,
      contextualQuickReplies: [],
    };
    var reShowTimer = null;

    var host = document.createElement("div");
    host.id = "vestachathost-widget";
    document.body.appendChild(host);

    var shadow = host.attachShadow({ mode: "open" });

    var style = document.createElement("style");
    style.textContent =
      "*{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}" +
      ".vch-root{position:fixed;bottom:24px;right:24px;z-index:2147483647;display:flex;flex-direction:column;align-items:flex-end;gap:16px}" +
      ".vch-panel{display:none;flex-direction:column;width:min(380px,calc(100vw - 32px));height:min(520px,calc(100vh - 8rem));border-radius:16px;border:1px solid " +
      theme.panelBorder +
      ";background:" +
      theme.chatBackground +
      ";box-shadow:0 25px 50px rgba(0,0,0,0.3);overflow:hidden}" +
      ".vch-panel.open{display:flex}" +
      ".vch-header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;color:#fff;background:linear-gradient(to right," +
      brandColor +
      "," +
      brandDark +
      ")}" +
      ".vch-header-left{display:flex;align-items:center;gap:12px}" +
      ".vch-mascot-wrap{width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0}" +
      ".vch-mascot{width:36px;height:36px;object-fit:contain}" +
      ".vch-title{margin:0;font-size:15px;font-weight:600}" +
      ".vch-subtitle{margin:2px 0 0;font-size:12px;opacity:0.9}" +
      ".vch-close{border:none;background:transparent;color:#fff;cursor:pointer;border-radius:8px;padding:6px;display:flex}" +
      ".vch-close:hover{background:rgba(255,255,255,0.2)}" +
      ".vch-messages{flex:1;overflow-y:auto;padding:16px;background:" +
      theme.messagesArea +
      "}" +
      ".vch-row{display:flex;margin-bottom:12px}" +
      ".vch-row.user{justify-content:flex-end}" +
      ".vch-row.bot{justify-content:flex-start}" +
      ".vch-bubble{max-width:85%;padding:10px 16px;border-radius:16px;font-size:14px;line-height:1.5;white-space:pre-line}" +
      ".vch-bubble.user{background:" +
      theme.userBubble +
      ";color:" +
      theme.userText +
      ";border-bottom-right-radius:4px}" +
      ".vch-bubble.bot{background:" +
      theme.botBubble +
      ";color:" +
      theme.botText +
      ";border:1px solid " +
      theme.panelBorder +
      ";border-bottom-left-radius:4px}" +
      ".vch-action{display:flex;width:100%;margin-top:10px;align-items:center;justify-content:center;border-radius:8px;padding:10px 16px;font-size:14px;font-weight:600;color:#fff;text-decoration:none}" +
      ".vch-btn-solid{display:flex;width:100%;margin-top:10px;align-items:center;justify-content:center;border:none;border-radius:8px;padding:10px 16px;font-size:14px;font-weight:600;color:#fff;cursor:pointer}" +
      ".vch-typing{display:flex;justify-content:flex-start;margin-bottom:12px}" +
      ".vch-typing-bubble{display:flex;gap:4px;padding:12px 16px;border-radius:16px;border-bottom-left-radius:4px;background:" +
      theme.botBubble +
      "}" +
      ".vch-dot{width:8px;height:8px;border-radius:50%;background:" +
      brandColor +
      ";animation:vch-bounce 1s infinite}" +
      ".vch-dot:nth-child(2){animation-delay:0.15s}" +
      ".vch-dot:nth-child(3){animation-delay:0.3s}" +
      "@keyframes vch-bounce{0%,80%,100%{transform:translateY(0);opacity:0.5}40%{transform:translateY(-6px);opacity:1}}" +
      ".vch-quick{display:flex;flex-direction:column;padding:12px;border-top:1px solid " +
      theme.footerBorder +
      ";background:" +
      theme.quickReplyBackground +
      "}" +
      ".vch-quick-label{font-size:11px;font-weight:600;opacity:0.55;margin:0 0 8px;color:" +
      theme.botText +
      "}" +
      ".vch-quick-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}" +
      ".vch-quick-btn{border-radius:12px;border:1px solid " +
      brandColor +
      "35;background:" +
      brandColor +
      "10;color:" +
      shadeHex(brandColor, -50) +
      ";padding:10px 12px;font-size:12px;font-weight:500;text-align:left;cursor:pointer;line-height:1.3}" +
      ".vch-quick-btn:disabled{opacity:0.5;cursor:not-allowed}" +
      ".vch-header-right{display:flex;align-items:center;gap:8px}" +
      ".vch-start-link{border:none;background:transparent;color:rgba(255,255,255,0.65);font-size:11px;cursor:pointer;padding:4px 8px;border-radius:6px;transition:color 0.15s}" +
      ".vch-start-link:hover{color:rgba(255,255,255,1)}" +
      ".vch-footer{display:flex;gap:8px;padding:12px;border-top:1px solid " +
      theme.footerBorder +
      ";background:" +
      theme.footerBackground +
      "}" +
      ".vch-input{flex:1;border-radius:12px;border:1px solid " +
      theme.panelBorder +
      ";background:" +
      theme.inputBackground +
      ";color:" +
      theme.inputText +
      ";padding:10px 16px;font-size:14px;outline:none}" +
      ".vch-input:focus{box-shadow:0 0 0 2px " +
      brandColor +
      "40}" +
      ".vch-input:disabled{opacity:0.6}" +
      ".vch-send{width:40px;height:40px;flex-shrink:0;border:none;border-radius:12px;background:" +
      brandColor +
      ";color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center}" +
      ".vch-send:disabled{opacity:0.4;cursor:not-allowed}" +
      ".vch-launcher{width:56px;height:56px;border:none;border-radius:50%;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;background:linear-gradient(to bottom right," +
      brandColor +
      "," +
      brandDark +
      ");box-shadow:0 10px 25px " +
      brandColor +
      "40;transition:transform 0.15s}" +
      ".vch-launcher:hover{transform:scale(1.05)}" +
      ".vch-launcher:active{transform:scale(0.95)}";
    shadow.appendChild(style);

    var root = document.createElement("div");
    root.className = "vch-root";
    root.innerHTML =
      '<div class="vch-panel" role="dialog">' +
      '<header class="vch-header">' +
      '<div class="vch-header-left">' +
      '<div class="vch-mascot-wrap"><img class="vch-mascot" src="" alt="" /></div>' +
      "<div><h2 class=\"vch-title\"></h2><p class=\"vch-subtitle\"></p></div></div>" +
      '<div class="vch-header-right">' +
      '<button type="button" class="vch-start-link">↩ Start Over</button>' +
      '<button type="button" class="vch-close" aria-label="Close chat">' +
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>' +
      "</button></div></header>" +
      '<div class="vch-messages"></div>' +
      '<div class="vch-quick" style="display:none"></div>' +
      '<form class="vch-footer">' +
      '<input class="vch-input" type="text" autocomplete="off" placeholder="Type your message\u2026" />' +
      '<button type="submit" class="vch-send" aria-label="Send">' +
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z"/></svg>' +
      "</button></form></div>" +
      '<button type="button" class="vch-launcher" aria-label="Open chat">' +
      '<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.164-.096l-2.165-3.24a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97z" clip-rule="evenodd"/></svg>' +
      "</button>";
    shadow.appendChild(root);

    var panel = root.querySelector(".vch-panel");
    var titleEl = root.querySelector(".vch-title");
    var subtitleEl = root.querySelector(".vch-subtitle");
    var mascotImgEl = root.querySelector(".vch-mascot");
    var messagesEl = root.querySelector(".vch-messages");
    var quickEl = root.querySelector(".vch-quick");
    var formEl = root.querySelector(".vch-footer");
    var inputEl = root.querySelector(".vch-input");
    var sendBtn = root.querySelector(".vch-send");
    var launcherBtn = root.querySelector(".vch-launcher");
    var closeBtn = root.querySelector(".vch-close");
    var startLinkBtn = root.querySelector(".vch-start-link");

    titleEl.textContent = businessName;
    subtitleEl.textContent =
      (displayMascotName !== businessName ? displayMascotName + " \u00B7 " : "") +
      "Online";
    mascotImgEl.src = mascotUrl;
    mascotImgEl.alt = displayMascotName + " mascot";
    panel.setAttribute("aria-label", "Chat with " + businessName);

    function updateInput() {
      inputEl.disabled = state.isTyping;
      sendBtn.disabled = !state.input.trim() || state.isTyping;
      inputEl.placeholder = "Type your message\u2026";
    }

    function scrollBottom() {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function isSafeUrl(url) {
      try {
        var p = new URL(String(url)).protocol;
        return p === "https:" || p === "http:";
      } catch (e) {
        return false;
      }
    }

    function addActionButton(parent, url, label) {
      if (!isSafeUrl(url)) return;
      var link = document.createElement("a");
      link.className = "vch-action";
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = label;
      link.style.backgroundColor = brandColor;
      parent.appendChild(link);
    }

    function renderBotBubble(msg) {
      var row = document.createElement("div");
      row.className = "vch-row bot";
      var bubble = document.createElement("div");
      bubble.className = "vch-bubble bot";

      var text = document.createElement("span");
      text.textContent = msg.content;
      bubble.appendChild(text);

      if (msg.bookButtonUrl) {
        addActionButton(bubble, msg.bookButtonUrl, "\uD83D\uDCC5 Book Now");
      }
      if (msg.payButtonUrl) {
        addActionButton(bubble, msg.payButtonUrl, "Pay Now");
      }

      if (msg.startNewChat) {
        var restart = document.createElement("button");
        restart.type = "button";
        restart.className = "vch-btn-solid";
        restart.textContent = "Start New Chat";
        restart.style.backgroundColor = brandColor;
        restart.addEventListener("click", resetChat);
        bubble.appendChild(restart);
      }

      row.appendChild(bubble);
      return row;
    }

    function renderMessages() {
      messagesEl.innerHTML = "";
      state.messages.forEach(function (msg) {
        if (msg.role === "user") {
          var userRow = document.createElement("div");
          userRow.className = "vch-row user";
          var userBubble = document.createElement("div");
          userBubble.className = "vch-bubble user";
          userBubble.textContent = msg.content;
          userRow.appendChild(userBubble);
          messagesEl.appendChild(userRow);
        } else {
          messagesEl.appendChild(renderBotBubble(msg));
        }
      });

      if (state.isTyping) {
        var typing = document.createElement("div");
        typing.className = "vch-typing";
        typing.innerHTML =
          '<div class="vch-typing-bubble"><span class="vch-dot"></span><span class="vch-dot"></span><span class="vch-dot"></span></div>';
        messagesEl.appendChild(typing);
      }
      scrollBottom();
    }

    function renderQuickReplies() {
      var showInitial = state.showQuickReplies && allButtons.length;
      var showContextual =
        !state.showQuickReplies &&
        state.contextualQuickReplies.length;

      if (showInitial || showContextual) {
        quickEl.style.display = "flex";
        quickEl.innerHTML = "";

        if (showInitial) {
          var lbl = document.createElement("p");
          lbl.className = "vch-quick-label";
          lbl.textContent = "Quick questions:";
          quickEl.appendChild(lbl);
        }

        var grid = document.createElement("div");
        grid.className = "vch-quick-grid";

        var toShow = showInitial ? allButtons : state.contextualQuickReplies;
        toShow.forEach(function (label) {
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "vch-quick-btn";
          btn.textContent = label;
          btn.disabled = state.isTyping;
          btn.addEventListener("click", function () {
            sendMessage(label);
          });
          grid.appendChild(btn);
        });

        quickEl.appendChild(grid);
      } else {
        quickEl.style.display = "none";
        quickEl.innerHTML = "";
      }
    }

    function render() {
      renderMessages();
      renderQuickReplies();
      updateInput();
    }

    function addMessage(content, extra) {
      var msg = { role: "assistant", content: content };
      if (extra) {
        for (var key in extra) {
          if (Object.prototype.hasOwnProperty.call(extra, key)) {
            msg[key] = extra[key];
          }
        }
      }
      state.messages.push(msg);
      render();
    }

    function resetChat() {
      if (reShowTimer) { clearTimeout(reShowTimer); reShowTimer = null; }
      state.messages = [welcomeMessage];
      state.showQuickReplies = true;
      state.input = "";
      state.contextualQuickReplies = [];
      inputEl.value = "";
      render();
    }

    function handleBooking() {
      if (bookingUrl) {
        addMessage(
          "I'd love to help you schedule! Click below to see our available times and book instantly \uD83D\uDCC5",
          { bookButtonUrl: bookingUrl }
        );
      } else {
        addMessage(
          "To book an appointment please call us at " +
            supportPhone +
            " or email " +
            supportEmail
        );
      }
    }

    function fetchAiReply() {
      state.isTyping = true;
      render();

      var effectiveBusinessInfo =
        bookingUrl && businessInfo.indexOf(bookingUrl) === -1
          ? businessInfo + ". To book an appointment online: " + bookingUrl
          : businessInfo;
      console.log("[widget] businessInfo being sent:", effectiveBusinessInfo.substring(0, 500));
      return fetch(baseUrl + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: toApiMessages(state.messages),
          businessName: businessName,
          businessInfo: effectiveBusinessInfo,
          industry: industry,
        }),
      })
        .then(function (res) {
          return res.json().then(function (data) {
            if (!res.ok) throw new Error(data.error || "Request failed");
            return data;
          });
        })
        .then(function (data) {
          state.isTyping = false;
          var botText = data.message;
          state.messages.push({ role: "assistant", content: botText });
          state.contextualQuickReplies = buildContextualReplies(botText);
          render();
          if (CONVERSATION_END_PATTERN.test(botText) && allButtons.length > 0) {
            reShowTimer = setTimeout(function () {
              state.showQuickReplies = true;
              reShowTimer = null;
              render();
            }, 1000);
          }
        })
        .catch(function () {
          state.isTyping = false;
          addMessage(
            "Sorry, something went wrong on our end. Please try again in a moment."
          );
        });
    }

    function sendMessage(text) {
      var trimmed = String(text || "").trim();
      if (!trimmed || state.isTyping) {
        return;
      }

      if (reShowTimer) { clearTimeout(reShowTimer); reShowTimer = null; }

      state.messages.push({ role: "user", content: trimmed });
      state.input = "";
      inputEl.value = "";
      state.showQuickReplies = false;
      state.contextualQuickReplies = [];
      render();

      if (isBookingIntent(trimmed)) {
        handleBooking();
        return;
      }
      if (isPaymentIntent(trimmed)) {
        addMessage(pricingInfo, { payButtonUrl: payNowUrl || undefined });
        return;
      }
      if (isTalkToSomeoneIntent(trimmed)) {
        addMessage(supportMessage());
        return;
      }

      var qaAnswer = qaAnswerMap[trimmed.toLowerCase()];
      if (qaAnswer) {
        addMessage(qaAnswer);
        return;
      }

      if (AFFIRMATIVE_PATTERN.test(trimmed) && lastBotWasFollowUp(state.messages)) {
        addMessage("Of course! Here's what I can help you with:");
        state.showQuickReplies = true;
        render();
        return;
      }

      fetchAiReply();
    }

    launcherBtn.addEventListener("click", function () {
      state.isOpen = !state.isOpen;
      panel.classList.toggle("open", state.isOpen);
      if (state.isOpen) {
        inputEl.focus();
        scrollBottom();
      }
    });

    closeBtn.addEventListener("click", function () {
      resetChat();
      state.isOpen = false;
      panel.classList.remove("open");
    });

    startLinkBtn.addEventListener("click", resetChat);

    formEl.addEventListener("submit", function (e) {
      e.preventDefault();
      sendMessage(state.input);
    });

    inputEl.addEventListener("input", function () {
      state.input = inputEl.value;
      updateInput();
    });

    render();
  }

  function boot() {
    var info = getScriptInfo();
    if (!info) {
      console.error("[VestaChatHost] Missing client id in widget.js URL.");
      return;
    }

    fetch(info.baseUrl + "/api/widget?id=" + encodeURIComponent(info.id))
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load chatbot config");
        return res.json();
      })
      .then(function (config) {
        createWidget(config, info.baseUrl);
      })
      .catch(function (err) {
        console.error("[VestaChatHost] Widget failed to load:", err);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
