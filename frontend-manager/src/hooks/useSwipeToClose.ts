import { useRef } from 'react';

export function useSwipeToClose(onClose: () => void, threshold = 80) {
  const startY = useRef(0);
  const dragY = useRef(0);

  return {
    onTouchStart: (e: React.TouchEvent) => { startY.current = e.touches[0].clientY; dragY.current = 0; },
    onTouchMove: (e: React.TouchEvent) => {
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0) dragY.current = delta;
    },
    onTouchEnd: () => { if (dragY.current > threshold) onClose(); },
  };
}
