import React from 'react';

interface AuthFormShellProps {
  /** Small icon shown above the heading */
  icon: React.ReactNode;
  /** Main heading */
  heading: string;
  /** Sub-heading / descriptor */
  subheading: string;
  /** The actual form content */
  children: React.ReactNode;
  /** Optional footer content (copyright, links) */
  footer?: React.ReactNode;
  /** Optional feature chips shown below the subheading on mobile/tablet */
  features?: { icon: React.ReactNode; text: string }[];
}

/**
 * Container for the form side of every login page.
 * Provides consistent heading, icon, max-width, and spacing.
 */
export function AuthFormShell({
  icon,
  heading,
  subheading,
  children,
  footer,
  features = [],
}: AuthFormShellProps) {
  return (
    <div className="w-full max-w-sm md:max-w-md">
      {/* Heading block */}
      <div className="flex flex-col items-start gap-5 mb-6">
        {/* Mobile brand + icon row */}
        <div className="flex items-center gap-3 md:hidden">
          <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 [&>svg]:w-5 [&>svg]:h-5">
            {icon}
          </div>
          <span className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">
            RSBS School
          </span>
        </div>

        {/* Desktop icon */}
        <div className="hidden md:flex items-center justify-center w-12 h-12 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 [&>svg]:w-6 [&>svg]:h-6">
          {icon}
        </div>

        <div className="space-y-1.5">
          <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-foreground text-balance">
            {heading}
          </h1>
          <p className="text-sm text-muted-foreground font-medium leading-relaxed text-pretty">
            {subheading}
          </p>
        </div>

        {/* Mobile/tablet feature chips */}
        {features.length > 0 && (
          <div className="flex flex-wrap gap-2 md:hidden">
            {features.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-xs font-medium text-primary"
              >
                <span className="[&>svg]:w-3.5 [&>svg]:h-3.5">{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form content */}
      <div className="space-y-5">{children}</div>

      {/* Footer */}
      {footer && (
        <div className="mt-8 pt-6 border-t border-border">{footer}</div>
      )}
    </div>
  );
}
