import React from 'react';

interface Feature {
  icon: React.ReactNode;
  text: string;
}

interface AuthBrandPanelProps {
  /** CSS gradient / solid class for the panel background */
  gradientClass: string;
  /** Large icon or illustration rendered in the circle */
  icon: React.ReactNode;
  /** Portal name, e.g. "Admin Portal" */
  title: string;
  /** One-line tagline */
  tagline: string;
  /** Optional feature bullet list (3 items ideal) */
  features?: Feature[];
}

/**
 * Reusable left-panel branding block used inside AuthLayout.
 */
export function AuthBrandPanel({
  gradientClass,
  icon,
  title,
  tagline,
  features = [],
}: AuthBrandPanelProps) {
  return (
    <div className={`relative flex flex-col justify-between h-full w-full p-10 xl:p-14 ${gradientClass}`}>
      {/* Background geometric accent */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute bottom-12 -left-16 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute top-1/2 right-8 w-32 h-32 rounded-full bg-white/5" />
      </div>

      {/* School wordmark */}
      <div className="relative z-10">
        <span className="text-xs font-bold font-medium text-white/60">
          RSBS School
        </span>
      </div>

      {/* Central content */}
      <div className="relative z-10 flex flex-col gap-8">
        {/* Icon circle */}
        <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 shadow-2xl">
          <div className="text-white [&>svg]:w-10 [&>svg]:h-10">{icon}</div>
        </div>

        <div className="space-y-3">
          <h2 className="font-heading text-3xl xl:text-4xl font-bold text-white leading-tight text-balance">
            {title}
          </h2>
          <p className="text-base text-white/70 font-medium leading-relaxed max-w-xs text-pretty">
            {tagline}
          </p>
        </div>

        {features.length > 0 && (
          <ul className="space-y-3">
            {features.map((f, i) => (
              <li key={i} className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-white [&>svg]:w-4 [&>svg]:h-4">
                  {f.icon}
                </div>
                <span className="text-sm text-white/80 font-medium">{f.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Bottom footnote */}
      <div className="relative z-10">
        <p className="text-xs font-bold font-medium text-white/40">
          © {new Date().getFullYear()} RSBS School Management System
        </p>
      </div>
    </div>
  );
}
