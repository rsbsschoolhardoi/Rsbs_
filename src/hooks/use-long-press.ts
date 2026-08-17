import { useCallback, useRef } from 'react';

interface LongPressHandlers {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

/**
 * Long-press hook for mobile action menus.
 * Triggers `onLongPress` after `ms` of uninterrupted touch.
 * Cancels on touch move/end/cancel and blocks the native context menu.
 */
export function useLongPress(
  onLongPress: () => void,
  ms = 500
): LongPressHandlers {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didTrigger = useRef(false);

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const start = useCallback(
    (e: React.TouchEvent) => {
      didTrigger.current = false;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        didTrigger.current = true;
        onLongPress();
      }, ms);
    },
    [onLongPress, ms]
  );

  const end = useCallback(
    (e: React.TouchEvent) => {
      clear();
      if (didTrigger.current) {
        e.preventDefault();
      }
    },
    [clear]
  );

  const move = useCallback(() => {
    clear();
  }, [clear]);

  const blockContext = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
    },
    []
  );

  return {
    onTouchStart: start,
    onTouchEnd: end,
    onTouchMove: move,
    onContextMenu: blockContext,
  };
}
