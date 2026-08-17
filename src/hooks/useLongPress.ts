import { useCallback, useRef } from 'react';

interface LongPressOptions {
  threshold?: number;
  onLongPress: (e: React.TouchEvent | React.MouseEvent | React.PointerEvent) => void;
}

export function useLongPress({ threshold = 600, onLongPress }: LongPressOptions) {
  const timerRef = useRef<number | null>(null);
  const isLongPress = useRef(false);

  const start = useCallback(
    (e: React.TouchEvent | React.MouseEvent | React.PointerEvent) => {
      isLongPress.current = false;
      timerRef.current = window.setTimeout(() => {
        isLongPress.current = true;
        onLongPress(e);
      }, threshold);
    },
    [threshold, onLongPress]
  );

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const end = useCallback(
    (e: React.TouchEvent | React.MouseEvent | React.PointerEvent) => {
      cancel();
      if (isLongPress.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    [cancel]
  );

  const preventContextMenu = useCallback((e: React.MouseEvent) => {
    if (isLongPress.current) {
      e.preventDefault();
    }
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isLongPress.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  return {
    onPointerDown: start,
    onPointerUp: end,
    onPointerLeave: cancel,
    onContextMenu: preventContextMenu,
    onClick: handleClick,
  };
}
