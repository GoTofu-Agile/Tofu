import { Check } from "lucide-react";

const features = [
  "Build rich AI personas from real research",
  "Run simulated interviews at scale—instantly",
  "Get AI-generated insights without manual analysis",
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Brand panel — hidden on mobile */}
      <div className="relative hidden overflow-hidden lg:flex lg:w-[46%] flex-col bg-[oklch(0.13_0_0)] p-12">
        {/* Subtle dot-grid overlay */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        {/* Soft glow at bottom-right */}
        <div className="pointer-events-none absolute -bottom-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-white/[0.03] blur-3xl" />

        <div className="relative z-10 flex h-full flex-col">
          {/* Logo */}
          <div>
            <span className="text-base font-semibold tracking-tight text-white">
              GoTofu
            </span>
          </div>

          {/* Hero copy */}
          <div className="flex flex-1 flex-col justify-center">
            <h2 className="max-w-xs text-balance text-[2rem] font-semibold leading-tight text-white">
              Research at the speed of your ideas.
            </h2>
            <p className="mt-4 max-w-xs text-pretty text-sm leading-relaxed text-white/50">
              AI personas, simulated interviews, and automated insights—without
              recruiting a single participant.
            </p>
            <ul className="mt-10 space-y-3.5">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-white/70">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/10">
                    <Check className="h-2.5 w-2.5 text-white/80" />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Testimonial */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm italic leading-relaxed text-white/60">
              &ldquo;GoTofu cut our research cycle from 3 weeks to 3 hours.
              It&apos;s become indispensable for our team.&rdquo;
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white/70">
                SC
              </div>
              <div>
                <p className="text-xs font-medium text-white/60">Sarah Chen</p>
                <p className="text-xs text-white/40">Head of UX, Meridian</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-[360px]">
          {/* Mobile logo */}
          <div className="mb-8 text-center lg:hidden">
            <span className="text-base font-semibold tracking-tight">GoTofu</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
