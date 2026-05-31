"use client";

import Image from "next/image";

/**
 * Industry mascots from PNG assets in /public/mascots.
 * Animations: bounce | thinking | celebrate (applied to the image wrapper).
 *
 * @param {{ industry?: string, animation?: 'idle'|'bounce'|'thinking'|'celebrate', className?: string, size?: number }} props
 * size >= 96 → 140×140 (builder preview); otherwise 60×60 (chat widget & smaller uses).
 */
const MASCOT_SRC = {
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

function resolveDimensions(size) {
  if (size >= 96) {
    return { width: 140, height: 140 };
  }
  return { width: 60, height: 60 };
}

export default function MascotCharacter({
  industry = "other",
  animation = "idle",
  className = "",
  size = 48,
}) {
  const animClass =
    animation === "bounce"
      ? "mascot-bounce"
      : animation === "thinking"
        ? "mascot-thinking"
        : animation === "celebrate"
          ? "mascot-celebrate"
          : "";

  const src = MASCOT_SRC[industry] ?? MASCOT_SRC.other;
  const { width, height } = resolveDimensions(size);

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden ${animClass} ${className}`}
      style={{ width, height }}
      aria-hidden
    >
      <Image
        src={src}
        alt=""
        width={width}
        height={height}
        className="max-h-full max-w-full object-contain"
        sizes={`${width}px`}
        priority={size >= 96}
      />
    </div>
  );
}
