"use client";

/**
 * Detailed industry mascots — round body, expressive face, limbs, props.
 * Animations: bounce | thinking | celebrate
 */
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

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={`${animClass} ${className}`}
      aria-hidden
    >
      {renderMascot(industry, animation === "thinking")}
    </svg>
  );
}

function Limbs({ bodyCx = 60, bodyCy = 62, bodyR = 32, flex = false, thinking = false }) {
  const armY = bodyCy - 4;
  const legY = bodyCy + bodyR - 6;
  return (
    <g>
      {flex ? (
        <>
          <path
            d={`M${bodyCx - bodyR + 4} ${armY} Q${bodyCx - bodyR - 14} ${armY - 18} ${bodyCx - bodyR - 8} ${armY - 28}`}
            fill="none"
            stroke="#4a3728"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d={`M${bodyCx + bodyR - 4} ${armY} Q${bodyCx + bodyR + 14} ${armY - 18} ${bodyCx + bodyR + 8} ${armY - 28}`}
            fill="none"
            stroke="#4a3728"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <ellipse cx={bodyCx - bodyR - 2} cy={armY} rx="7" ry="10" fill="#e8c4a0" stroke="#c49a6c" strokeWidth="1.5" />
          <ellipse cx={bodyCx + bodyR + 2} cy={armY} rx="7" ry="10" fill="#e8c4a0" stroke="#c49a6c" strokeWidth="1.5" />
        </>
      )}
      <ellipse cx={bodyCx - 12} cy={legY + 10} rx="9" ry="7" fill="#4a3728" />
      <ellipse cx={bodyCx + 12} cy={legY + 10} rx="9" ry="7" fill="#4a3728" />
      {thinking && (
        <>
          <circle cx="98" cy="22" r="4" fill="#94a3b8" className="mascot-thought-dot" />
          <circle cx="106" cy="12" r="3" fill="#cbd5e1" className="mascot-thought-dot-delay" />
        </>
      )}
    </g>
  );
}

function CuteFace({ cx = 60, cy = 52, thinking = false, mouthWide = true }) {
  return (
    <g>
      <ellipse cx={cx - 14} cy={cy - 4} rx="11" ry="13" fill="white" stroke="#1e293b" strokeWidth="1.5" />
      <ellipse cx={cx + 14} cy={cy - 4} rx="11" ry="13" fill="white" stroke="#1e293b" strokeWidth="1.5" />
      <circle cx={cx - 11} cy={cy - 6} r="5" fill="#1e293b" />
      <circle cx={cx + 17} cy={cy - 6} r="5" fill="#1e293b" />
      <circle cx={cx - 9} cy={cy - 8} r="2" fill="white" />
      <circle cx={cx + 19} cy={cy - 8} r="2" fill="white" />
      <ellipse cx={cx} cy={cy + 6} rx="4" ry="3" fill="#f9a8d4" opacity="0.7" />
      {thinking ? (
        <path
          d={`M${cx - 10} ${cy + 18} Q${cx} ${cy + 12} ${cx + 10} ${cy + 18}`}
          fill="none"
          stroke="#1e293b"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      ) : mouthWide ? (
        <path
          d={`M${cx - 16} ${cy + 14} Q${cx} ${cy + 28} ${cx + 16} ${cy + 14}`}
          fill="#1e293b"
        />
      ) : (
        <path
          d={`M${cx - 8} ${cy + 16} Q${cx} ${cy + 22} ${cx + 8} ${cy + 16}`}
          fill="none"
          stroke="#1e293b"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
    </g>
  );
}

function renderMascot(industry, thinking) {
  switch (industry) {
    case "dental":
      return <DentalMascot thinking={thinking} />;
    case "gym":
      return <GymMascot thinking={thinking} />;
    case "salon":
      return <SalonMascot thinking={thinking} />;
    case "restaurant":
      return <RestaurantMascot thinking={thinking} />;
    case "real_estate":
      return <RealEstateMascot thinking={thinking} />;
    case "law":
      return <LawMascot thinking={thinking} />;
    case "barber":
      return <BarberMascot thinking={thinking} />;
    case "lawn":
      return <LawnMascot thinking={thinking} />;
    default:
      return <RobotMascot thinking={thinking} />;
  }
}

function DentalMascot({ thinking }) {
  return (
    <g>
      <ellipse cx="60" cy="58" rx="34" ry="38" fill="#fafafa" stroke="#e2e8f0" strokeWidth="2" />
      <path d="M38 72 Q60 88 82 72" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5" />
      <CuteFace cy={54} thinking={thinking} />
      <Limbs bodyCy={58} thinking={thinking} />
      <g transform="translate(88, 28) rotate(15)">
        <circle cx="0" cy="0" r="14" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
        <circle cx="0" cy="0" r="9" fill="#bae6fd" opacity="0.6" />
        <line x1="-16" y1="0" x2="-22" y2="8" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
      </g>
    </g>
  );
}

function GymMascot({ thinking }) {
  return (
    <g>
      <ellipse cx="60" cy="60" rx="36" ry="34" fill="#fcd9b8" stroke="#e8b896" strokeWidth="2" />
      <rect x="38" y="22" width="44" height="10" rx="5" fill="#dc2626" />
      <rect x="40" y="24" width="40" height="4" rx="2" fill="#fef2f2" opacity="0.5" />
      <CuteFace cy={54} thinking={thinking} />
      <Limbs bodyCy={60} bodyR={34} flex thinking={thinking} />
    </g>
  );
}

function SalonMascot({ thinking }) {
  return (
    <g>
      <ellipse cx="60" cy="62" rx="34" ry="32" fill="#fde68a" stroke="#fbbf24" strokeWidth="2" />
      <path
        d="M30 48 Q60 18 90 48 Q85 38 60 32 Q35 38 30 48"
        fill="#7c2d12"
        stroke="#451a03"
        strokeWidth="1.5"
      />
      <path d="M42 42 Q60 28 78 42" fill="#92400e" opacity="0.5" />
      <CuteFace cy={56} thinking={thinking} />
      <Limbs bodyCy={62} thinking={thinking} />
      <g transform="translate(92, 52) rotate(-20)">
        <path d="M0 0 L8 -12 L0 -8 L-8 -12 Z" fill="#cbd5e1" stroke="#64748b" strokeWidth="1.5" />
        <path d="M0 -8 L0 14" stroke="#64748b" strokeWidth="2" />
      </g>
    </g>
  );
}

function RestaurantMascot({ thinking }) {
  return (
    <g>
      <ellipse cx="60" cy="66" rx="32" ry="30" fill="#fde68a" stroke="#f59e0b" strokeWidth="2" />
      <path
        d="M32 42 L60 8 L88 42 L82 48 L60 28 L38 48 Z"
        fill="white"
        stroke="#e5e7eb"
        strokeWidth="2"
      />
      <rect x="54" y="8" width="12" height="8" rx="2" fill="#f3f4f6" />
      <CuteFace cy={60} thinking={thinking} />
      <Limbs bodyCy={66} thinking={thinking} />
      <ellipse cx="88" cy="70" rx="8" ry="6" fill="white" stroke="#d1d5db" strokeWidth="1.5" />
    </g>
  );
}

function RealEstateMascot({ thinking }) {
  return (
    <g>
      <path
        d="M60 18 L95 50 L95 95 L25 95 L25 50 Z"
        fill="#fef3c7"
        stroke="#d97706"
        strokeWidth="2.5"
      />
      <path d="M60 18 L60 8" stroke="#b45309" strokeWidth="3" strokeLinecap="round" />
      <rect x="44" y="62" width="32" height="33" rx="4" fill="#78350f" />
      <ellipse cx="60" cy="48" rx="11" ry="13" fill="white" stroke="#1e293b" strokeWidth="1.5" />
      <ellipse cx="76" cy="48" rx="11" ry="13" fill="white" stroke="#1e293b" strokeWidth="1.5" />
      <circle cx="63" cy="46" r="4" fill="#1e293b" />
      <circle cx="79" cy="46" r="4" fill="#1e293b" />
      <circle cx="65" cy="44" r="1.5" fill="white" />
      <circle cx="81" cy="44" r="1.5" fill="white" />
      <ellipse cx="68" cy="54" rx="3" ry="2" fill="#f9a8d4" opacity="0.6" />
      {thinking ? (
        <rect x="48" y="72" width="24" height="4" rx="2" fill="#451a03" />
      ) : (
        <path d="M48 72 Q60 82 72 72" fill="#451a03" />
      )}
      <ellipse cx="48" cy="88" rx="8" ry="6" fill="#92400e" />
      <ellipse cx="72" cy="88" rx="8" ry="6" fill="#92400e" />
      {thinking && (
        <>
          <circle cx="100" cy="20" r="4" fill="#94a3b8" className="mascot-thought-dot" />
          <circle cx="108" cy="10" r="3" fill="#cbd5e1" className="mascot-thought-dot-delay" />
        </>
      )}
    </g>
  );
}

function LawMascot({ thinking }) {
  return (
    <g>
      <ellipse cx="60" cy="64" rx="32" ry="30" fill="#fde68a" stroke="#fbbf24" strokeWidth="2" />
      <path
        d="M28 50 Q60 22 92 50 Q88 42 60 36 Q32 42 28 50"
        fill="white"
        stroke="#d4d4d4"
        strokeWidth="2"
      />
      <path d="M32 48 Q60 30 88 48" fill="#f5f5f5" />
      <CuteFace cy={58} thinking={thinking} />
      <Limbs bodyCy={64} thinking={thinking} />
      <rect x="88" y="48" width="6" height="28" rx="2" fill="#78716c" />
    </g>
  );
}

function BarberMascot({ thinking }) {
  return (
    <g>
      <ellipse cx="60" cy="62" rx="34" ry="32" fill="#fcd9b8" stroke="#e8b896" strokeWidth="2" />
      <CuteFace cy={56} thinking={thinking} />
      <Limbs bodyCy={62} thinking={thinking} />
      <g transform="translate(88, 32)">
        <rect x="-10" y="0" width="20" height="50" rx="6" fill="white" stroke="#1e293b" strokeWidth="2" />
        <rect x="-10" y="0" width="20" height="12" fill="#dc2626" />
        <rect x="-10" y="24" width="20" height="12" fill="#1e40af" />
        <rect x="-10" y="38" width="20" height="12" fill="#dc2626" />
      </g>
    </g>
  );
}

function LawnMascot({ thinking }) {
  return (
    <g>
      <ellipse cx="60" cy="62" rx="36" ry="34" fill="#4ade80" stroke="#16a34a" strokeWidth="2.5" />
      <path d="M45 45 L60 22 L75 45" fill="#22c55e" stroke="#15803d" strokeWidth="2" />
      <path d="M52 50 L60 30 L68 50" fill="#86efac" opacity="0.6" />
      <path d="M38 58 Q60 48 82 58" fill="none" stroke="#15803d" strokeWidth="1.5" opacity="0.5" />
      <path d="M42 68 Q60 58 78 68" fill="none" stroke="#15803d" strokeWidth="1.5" opacity="0.5" />
      <CuteFace cy={58} thinking={thinking} />
      <ellipse cx="48" cy="88" rx="8" ry="6" fill="#166534" />
      <ellipse cx="72" cy="88" rx="8" ry="6" fill="#166534" />
      <ellipse cx="38" cy="64" rx="6" ry="9" fill="#22c55e" stroke="#15803d" strokeWidth="1.5" />
      <ellipse cx="82" cy="64" rx="6" ry="9" fill="#22c55e" stroke="#15803d" strokeWidth="1.5" />
      {thinking && (
        <>
          <circle cx="100" cy="22" r="4" fill="#94a3b8" className="mascot-thought-dot" />
          <circle cx="108" cy="12" r="3" fill="#cbd5e1" className="mascot-thought-dot-delay" />
        </>
      )}
    </g>
  );
}

function RobotMascot({ thinking }) {
  return (
    <g>
      <ellipse cx="60" cy="64" rx="34" ry="32" fill="#94a3b8" stroke="#64748b" strokeWidth="2" />
      <rect x="52" y="6" width="16" height="14" rx="4" fill="#64748b" />
      <circle cx="60" cy="4" r="5" fill="#22d3ee" className="mascot-thought-dot" />
      <line x1="60" y1="20" x2="60" y2="32" stroke="#475569" strokeWidth="3" />
      <rect x="42" y="28" width="36" height="22" rx="6" fill="#cbd5e1" stroke="#475569" strokeWidth="2" />
      <ellipse cx="52" cy="38" rx="7" ry="8" fill="white" />
      <ellipse cx="68" cy="38" rx="7" ry="8" fill="white" />
      <circle cx="52" cy="38" r="4" fill="#0ea5e9" />
      <circle cx="68" cy="38" r="4" fill="#0ea5e9" />
      <circle cx="54" cy="36" r="1.5" fill="white" />
      <circle cx="70" cy="36" r="1.5" fill="white" />
      {thinking ? (
        <rect x="48" y="44" width="24" height="3" rx="1.5" fill="#475569" />
      ) : (
        <path d="M48 46 Q60 54 72 46" fill="#475569" />
      )}
      <ellipse cx="44" cy="88" rx="10" ry="7" fill="#475569" />
      <ellipse cx="76" cy="88" rx="10" ry="7" fill="#475569" />
      <ellipse cx="38" cy="66" rx="8" ry="11" fill="#64748b" stroke="#475569" strokeWidth="1.5" />
      <ellipse cx="82" cy="66" rx="8" ry="11" fill="#64748b" stroke="#475569" strokeWidth="1.5" />
      {thinking && (
        <>
          <circle cx="100" cy="18" r="4" fill="#94a3b8" className="mascot-thought-dot" />
          <circle cx="108" cy="8" r="3" fill="#cbd5e1" className="mascot-thought-dot-delay" />
        </>
      )}
    </g>
  );
}
