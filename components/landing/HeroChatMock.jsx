import MascotCharacter from "../mascots/MascotCharacter";

const BRAND = "#0D7377";
const BRAND_DARK = "#0A5D61";

export default function HeroChatMock() {
  return (
    <div
      className="w-full max-w-sm overflow-hidden rounded-2xl border border-[#0D7377]/15 bg-white shadow-2xl lg:max-w-md"
      aria-hidden
    >
      <div
        className="flex items-center gap-3 px-4 py-3.5 text-white"
        style={{ background: `linear-gradient(to right, ${BRAND}, ${BRAND_DARK})` }}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/25">
          <MascotCharacter industry="salon" size={40} />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">Luna Hair Studio</p>
          <p className="text-xs text-white/90">Online</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 bg-[#F8F9FA] px-4 py-5">
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-2xl rounded-br-md bg-[#0D7377] px-4 py-2.5 text-sm text-white">
            Do you have anything open Saturday?
          </div>
        </div>
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm leading-relaxed text-[#1A1A2E] shadow-sm">
            Yes! I have 10:00 AM and 2:30 PM open this Saturday — want me to grab one for you?
          </div>
        </div>
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-2xl rounded-br-md bg-[#0D7377] px-4 py-2.5 text-sm text-white">
            2:30 works
          </div>
        </div>
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm leading-relaxed text-[#1A1A2E] shadow-sm">
            <p>You&apos;re booked for Saturday at 2:30 PM. See you then!</p>
            <p className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-[#0D7377] px-4 py-2.5 text-sm font-semibold text-white">
              📅 Added to calendar
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
