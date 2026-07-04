import { useT } from "@/lib/i18n"
import tuturWordmarkWhite from "@/assets/brand/tutur-wordmark-white-trim.png"
import tuturSymbolWhite from "@/assets/brand/tutur-symbol-white-trim.png"

/* ========================================================================== *
 *  BrandPanel — the violet marketing half of the split-screen auth/landing
 *  layout. Desktop only (hidden on mobile, where the single column carries the
 *  brand in its top nav). Uses the signature violet gradient hero surface.
 * ========================================================================== */
export default function BrandPanel() {
  const t = useT()
  return (
    <aside
      className="relative hidden overflow-hidden lg:flex lg:w-[46%] lg:max-w-[640px] lg:flex-col lg:px-12 lg:pb-12 lg:pt-8 xl:px-16 xl:pb-16"
      style={{ background: "var(--gradient-symbol)", color: "#fff" }}
      aria-hidden
    >
      {/* Soft depth — light bloom top-left, deep pool bottom-right */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 45% at 15% 0%, rgba(255,255,255,0.18), transparent 70%), radial-gradient(60% 50% at 100% 100%, rgba(38,21,92,0.5), transparent 70%)",
        }}
      />

      {/* Lockup — symbol first, then wordmark (matched heights). `self-start`
          stops the flex column from stretching/distorting the images. */}
      <div className="relative flex items-center gap-3 self-start">
        <img
          src={tuturSymbolWhite}
          alt=""
          className="h-8 w-auto select-none"
          draggable={false}
        />
        <img
          src={tuturWordmarkWhite}
          alt="Tutur"
          className="h-8 w-auto select-none"
          draggable={false}
        />
      </div>

      {/* Tagline — vertically centred in the remaining space */}
      <div className="relative flex flex-1 items-center">
        <div className="max-w-md">
          <h2
            className="text-[40px] font-extrabold leading-[1.08] tracking-tight xl:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t.intro.panelTagline}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-white/80">
            {t.intro.panelSub}
          </p>
        </div>
      </div>
    </aside>
  )
}
