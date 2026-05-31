"use client";

import { CHAT_THEME_IDS, getChatTheme } from "../../lib/chat-themes";

function MiniChatPreview({ themeId, brandColor }) {
  const theme = getChatTheme(themeId);
  const panelStyle = {
    background: theme.chatBackground,
    borderColor: theme.panelBorder,
    ...(theme.glass
      ? { backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }
      : {}),
  };

  return (
    <div
      className="overflow-hidden rounded-lg border p-2"
      style={panelStyle}
    >
      <div
        className="mb-2 rounded px-2 py-1 text-[8px] leading-tight"
        style={{
          background: theme.botBubble,
          color: theme.botText,
          maxWidth: "75%",
        }}
      >
        Hello!
      </div>
      <div
        className="ml-auto rounded px-2 py-1 text-[8px] leading-tight text-white"
        style={{ background: brandColor, maxWidth: "70%" }}
      >
        Hi
      </div>
      <div
        className="mt-2 h-3 rounded border"
        style={{
          background: theme.inputBackground,
          borderColor: theme.panelBorder,
        }}
      />
    </div>
  );
}

export default function ChatThemeSelector({ value, onChange, brandColor }) {
  return (
    <div>
      <p className="mb-3 text-sm font-medium text-[#D4AF37]">Chat theme</p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {CHAT_THEME_IDS.map((id) => {
          const theme = getChatTheme(id);
          const selected = value === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`rounded-xl border p-3 text-left transition ${
                selected
                  ? "border-[#D4AF37] bg-[#D4AF37]/10 ring-2 ring-[#D4AF37]/40"
                  : "border-white/10 bg-[#111111] hover:border-[#D4AF37]/30"
              }`}
            >
              <div
                className={`mb-2 overflow-hidden rounded-lg ${
                  theme.glass ? "bg-gradient-to-br from-slate-800 to-slate-900 p-1" : ""
                }`}
              >
                <MiniChatPreview themeId={id} brandColor={brandColor} />
              </div>
              <span
                className={`text-sm font-semibold ${
                  selected ? "text-[#F0D060]" : "text-white"
                }`}
              >
                {theme.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
