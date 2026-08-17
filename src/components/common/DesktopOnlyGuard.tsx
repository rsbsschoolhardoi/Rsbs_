import React from 'react';

export const DesktopOnlyGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Desktop viewport restriction has been removed so the admin panel is reachable
  // on any screen size (including mobile browsers using "Desktop site" mode).
  return <>{children}</>;
};
