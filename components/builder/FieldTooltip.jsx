"use client";

import { useEffect, useId, useRef, useState } from "react";

export default function FieldTooltip({ text }) {
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const rootRef = useRef(null);
  const tooltipId = useId();
  const visible = pinned || hovered;

  useEffect(() => {
    if (!pinned) return;

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setPinned(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [pinned]);

  return (
    <span
      ref={rootRef}
      className="relative inline-flex shrink-0"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        aria-label="More information"
        aria-expanded={visible}
        aria-describedby={visible ? tooltipId : undefined}
        onClick={() => setPinned((open) => !open)}
        className="flex h-4 w-4 items-center justify-center rounded-full border border-[#D4AF37]/50 bg-[#D4AF37]/10 text-[10px] font-bold leading-none text-[#F0D060] transition hover:border-[#D4AF37] hover:bg-[#D4AF37]/20"
      >
        ?
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-64 max-w-[min(16rem,calc(100vw-3rem))] -translate-x-1/2 rounded-xl border border-[#D4AF37]/30 bg-[#1A1A1A] px-3 py-2.5 text-left text-xs leading-relaxed text-[#a3a3a3] shadow-lg shadow-black/40 transition-opacity duration-150 sm:bottom-full sm:top-auto sm:mb-2 sm:mt-0 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      >
        {text}
      </span>
    </span>
  );
}
