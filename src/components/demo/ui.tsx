/* ========================================================================== *
 *  Tutur Demo — the component kit.
 *
 *  PRD rules, enforced by the components rather than by discipline:
 *    · ONE primary button per screen  → <Screen cta={...}> takes exactly one
 *    · ONE decision per screen        → <Choice> owns the whole body
 *    · large tap targets, one-handed  → 56px buttons, full-width option rows
 *    · nothing scrolls the page       → Screen is a fixed 2-band layout
 * ========================================================================== */

import { type ReactNode } from "react"

/* -------------------------------------------------------------------------- */
/*  Screen — the two-band shell every screen uses.                            */
/*                                                                            */
/*  Content on top, ONE primary button at the bottom. The body flexes; the CTA */
/*  is shrink-0, so it can never be pushed under the fold on a small phone.    */
/* -------------------------------------------------------------------------- */
export function Screen({
  children,
  cta,
  secondary,
  onBack,
  progress,
  pad = true,
  center = false,
}: {
  children: ReactNode
  /** THE primary button. One per screen — the PRD is right about this. */
  cta?: { label: string; onClick: () => void; disabled?: boolean }
  /** A quiet alternative (Replay, Skip). Never competes with the CTA. */
  secondary?: { label: string; onClick: () => void }
  onBack?: () => void
  /** Onboarding only. Back · bar · counter, exactly as the real app does it. */
  progress?: { step: number; total: number }
  pad?: boolean
  center?: boolean
}) {
  return (
    <div className="demo-screen flex h-full flex-col">
      {(onBack || progress) && (
        <div className="flex shrink-0 items-center gap-3 px-5 pt-5">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="demo-press flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{
              background: "rgba(106,47,232,0.10)",
              // The slot is always rendered, even with nowhere to go back to.
              // Hiding it would let the bar beside it change width, and a
              // progress bar that resizes appears to move backwards.
              visibility: onBack ? "visible" : "hidden",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M15 18l-6-6 6-6"
                stroke="var(--primary)"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {progress && (
            <>
              <div
                className="h-1.5 flex-1 overflow-hidden rounded-full"
                style={{ background: "var(--border)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(progress.step / progress.total) * 100}%`,
                    background: "var(--primary)",
                    transition: "width 500ms cubic-bezier(0.22,1,0.36,1)",
                  }}
                />
              </div>
              {/* Fixed width, always rendered — same reason as the back slot. */}
              <span
                className="shrink-0 text-right text-[12px] font-bold tabular-nums"
                style={{ width: 34, color: "var(--grey)" }}
              >
                {progress.step}/{progress.total}
              </span>
            </>
          )}
        </div>
      )}

      <div
        className={[
          "min-h-0 flex-1 overflow-y-auto",
          pad ? "px-6 py-6" : "",
          center ? "flex flex-col justify-center" : "",
        ].join(" ")}
      >
        {children}
      </div>

      {(cta || secondary) && (
        <div className="shrink-0 space-y-2.5 px-6 pb-8 pt-3">
          {cta && (
            <PrimaryButton onClick={cta.onClick} disabled={cta.disabled}>
              {cta.label}
            </PrimaryButton>
          )}
          {secondary && (
            <button
              type="button"
              onClick={secondary.onClick}
              className="demo-press w-full py-3 text-[15px] font-semibold"
              style={{ color: "var(--grey)" }}
            >
              {secondary.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */

export function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="demo-press w-full text-[17px] font-semibold text-white"
      style={{
        height: 56,
        borderRadius: 18,
        background: disabled ? "#d6d2e6" : "var(--primary)",
        boxShadow: disabled ? "none" : "0 10px 24px rgba(106,47,232,0.30)",
      }}
    >
      {children}
    </button>
  )
}

export function Card({
  children,
  className = "",
  tint,
  onClick,
}: {
  children: ReactNode
  className?: string
  tint?: string
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={`${onClick ? "demo-press cursor-pointer" : ""} ${className}`}
      style={{
        borderRadius: 28,
        padding: 24,
        background: tint ?? "#fff",
        boxShadow: "var(--shadow)",
      }}
    >
      {children}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Typography — the PRD's scale, as components, so it can't drift.           */
/* -------------------------------------------------------------------------- */
export function Title({ children }: { children: ReactNode }) {
  return (
    <h1 className="font-bold leading-tight" style={{ fontSize: 28, letterSpacing: "-0.02em" }}>
      {children}
    </h1>
  )
}

export function BigTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="font-bold leading-[1.1]" style={{ fontSize: 36, letterSpacing: "-0.03em" }}>
      {children}
    </h1>
  )
}

export function Body({ children }: { children: ReactNode }) {
  return (
    <p className="leading-relaxed" style={{ fontSize: 16, color: "var(--grey)" }}>
      {children}
    </p>
  )
}

export function Small({ children }: { children: ReactNode }) {
  return (
    <p className="leading-snug" style={{ fontSize: 14, color: "var(--grey)" }}>
      {children}
    </p>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p
      className="font-bold uppercase"
      style={{ fontSize: 12, letterSpacing: "0.08em", color: "var(--grey)" }}
    >
      {children}
    </p>
  )
}

/* -------------------------------------------------------------------------- */
/*  Choice — one decision, big targets, tap to select.                        */
/* -------------------------------------------------------------------------- */
export function Choice<T extends string>({
  options,
  value,
  onPick,
}: {
  options: { value: T; label: string; sub?: string }[]
  value?: T
  onPick: (v: T) => void
}) {
  return (
    <div className="space-y-3">
      {options.map((o) => {
        const on = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onPick(o.value)}
            aria-pressed={on}
            className="demo-press flex w-full items-center gap-3 text-left"
            style={{
              minHeight: 60,
              padding: "14px 18px",
              borderRadius: 18,
              background: on ? "rgba(106,47,232,0.07)" : "#fff",
              border: `2px solid ${on ? "var(--primary)" : "var(--border)"}`,
              boxShadow: on ? "none" : "var(--shadow-sm)",
            }}
          >
            <span
              className="flex shrink-0 items-center justify-center"
              style={{
                width: 22,
                height: 22,
                borderRadius: 999,
                border: `2px solid ${on ? "var(--primary)" : "var(--border)"}`,
                background: on ? "var(--primary)" : "transparent",
              }}
            >
              {on && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M5 13l4 4L19 7"
                    stroke="#fff"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
            <span className="min-w-0">
              <span className="block text-[16px] font-semibold">{o.label}</span>
              {o.sub && (
                <span className="block text-[13px]" style={{ color: "var(--grey)" }}>
                  {o.sub}
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* -------------------------------------------------------------------------- */

export function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full outline-none"
      style={{
        height: 56,
        borderRadius: 16,
        border: "2px solid var(--border)",
        background: "#fff",
        padding: "0 18px",
        fontSize: 16,
        color: "var(--text)",
      }}
      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
    />
  )
}

/* -------------------------------------------------------------------------- */
/*  Maya — the coach. An avatar and a bubble, nothing clinical anywhere near.  */
/* -------------------------------------------------------------------------- */
export function Maya({ size = 96 }: { size?: number }) {
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <div
        className="demo-breathe absolute inset-0 rounded-full"
        style={{ background: "var(--secondary)" }}
      />
      <img
        src="/maya.png"
        alt=""
        className="relative h-full w-full rounded-full object-cover"
        style={{ border: "3px solid #fff", boxShadow: "var(--shadow)" }}
      />
    </div>
  )
}

export function Bubble({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative"
      style={{
        borderRadius: 24,
        background: "#fff",
        padding: "18px 20px",
        boxShadow: "var(--shadow)",
        fontSize: 17,
        lineHeight: 1.55,
      }}
    >
      <span
        aria-hidden
        className="absolute"
        style={{
          top: -7,
          left: 28,
          width: 16,
          height: 16,
          background: "#fff",
          transform: "rotate(45deg)",
          borderRadius: 3,
        }}
      />
      {children}
    </div>
  )
}

/* -------------------------------------------------------------------------- */

export function Confetti() {
  const colours = ["#6A2FE8", "#8B5CFF", "#FF8A65", "#C9B4FF", "#F3ECFF"]
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: 42 }, (_, i) => (
        <span
          key={i}
          className="demo-confetti-piece"
          style={{
            left: `${(i * 37) % 100}%`,
            background: colours[i % colours.length],
            animationDelay: `${(i % 9) * 70}ms`,
          }}
        />
      ))}
    </div>
  )
}
