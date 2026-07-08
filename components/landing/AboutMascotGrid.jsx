import MascotCharacter from "../mascots/MascotCharacter";

const TILES = [
  { industry: "dental", label: "Dental" },
  { industry: "salon", label: "Salon" },
  { industry: "gym", label: "Gym" },
  { industry: "lawn", label: "Lawn Care" },
];

export default function AboutMascotGrid() {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-[#E2E8F0] bg-[#F8F9FA] p-6 shadow-xl lg:max-w-md">
      <p className="text-center text-xs font-semibold uppercase tracking-widest text-[#0D7377]">
        Every industry gets its own mascot
      </p>
      <div className="mt-5 grid grid-cols-2 gap-4">
        {TILES.map((tile) => (
          <div
            key={tile.industry}
            className="flex flex-col items-center rounded-xl border border-[#E2E8F0] bg-white py-5"
          >
            <MascotCharacter industry={tile.industry} size={100} />
            <p className="mt-2 text-xs font-medium text-[#4A5568]">{tile.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
