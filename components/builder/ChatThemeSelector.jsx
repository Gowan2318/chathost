"use client";

import { CHAT_THEME_IDS, getChatTheme } from "../../lib/chat-themes";

function MiniChatPreview({ themeId, brandColor }) {
  const theme = getChatTheme(themeId);
  const isDark = themeId === "dark" || themeId === "midnight";
  const isGlass = theme.glass;

  const panelStyle = {
    background: theme.chatBackground,
    borderColor: theme.panelBorder,
    ...(isGlass
      ? { backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }
      : {}),
  };

  const darkShadow = "0 2px 4px rgba(0,0,0,0.9)";
  const glassShadow = "0 2px 6px rgba(0,0,0,1)";
  const textShadow = isGlass ? glassShadow : isDark ? darkShadow : undefined;

  return (
    <div
      className="overflow-hidden rounded-lg border p-2"
      style={panelStyle}
    >
      <div
        className="relative mb-2 overflow-hidden rounded px-2 py-1 text-[8px] leading-tight"
        style={{
          background: theme.botBubble,
          color: theme.botText,
          maxWidth: "75%",
        }}
      >
        {isGlass && <div className="absolute inset-0 bg-black/60" />}
        <span className="relative" style={{ textShadow }}>Hello!</span>
      </div>
      <div
        className="ml-auto rounded px-2 py-1 text-[8px] leading-tight text-white"
        style={{ background: brandColor, maxWidth: "70%", textShadow }}
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
      <p className="mb-3 text-sm font-medium text-[#4A5568]">Chat theme</p>
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
                  ? "border-[#0D7377] bg-[#0D7377]/10 ring-2 ring-[#0D7377]/40"
                  : "border-[#E2E8F0] bg-white hover:border-[#0D7377]/30"
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
                  selected ? "text-[#0D7377]" : "text-[#1A1A2E]"
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
