import React from 'react';

interface AuthLayoutProps {
  /** Content shown in the decorative left panel (desktop only) */
  panel: React.ReactNode;
  /** The form area (right side on desktop, full-screen on mobile) */
  children: React.ReactNode;
  /** Optional extra class on the root wrapper */
  className?: string;
}

/**
 * Shared split-panel layout for all login pages.
 * Mobile:  form takes full screen, panel is hidden.
 * Tablet:  form is centred card, panel is hidden.
 * Desktop: 40/60 split — decorative panel left, form right.
 */
export function AuthLayout({ panel, children, className = '' }: AuthLayoutProps) {
  return (
    <div className={`min-h-screen flex bg-background text-foreground ${className}`}>
      {/* ── Left decorative panel (md+) ── */}
      <div className="hidden md:flex md:w-[420px] lg:w-[480px] xl:w-[520px] shrink-0 flex-col relative overflow-hidden">
        {panel}
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 min-w-0 flex flex-col items-center justify-center px-4 py-12 md:px-10 lg:px-16 xl:px-24 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
