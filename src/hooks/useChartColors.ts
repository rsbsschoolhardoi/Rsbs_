import { useEffect, useState } from 'react';

export function useChartColors() {
  const [colors, setColors] = useState({
    primary: 'hsl(222 47% 11%)',
    accent: 'hsl(243 75% 59%)',
    secondary: 'hsl(215 16% 47%)',
    muted: 'hsl(210 40% 96%)',
    success: 'hsl(160 84% 39%)',
    warning: 'hsl(38 92% 50%)',
    destructive: 'hsl(0 84% 60%)',
  });

  useEffect(() => {
    const root = document.documentElement;
    const get = (name: string) => {
      const value = getComputedStyle(root).getPropertyValue(`--${name}`).trim();
      return value ? `hsl(${value})` : colors[name as keyof typeof colors];
    };
    setColors({
      primary: get('primary'),
      accent: get('accent'),
      secondary: get('secondary'),
      muted: get('muted'),
      success: get('success'),
      warning: get('warning'),
      destructive: get('destructive'),
    });
  }, []);

  return colors;
}
