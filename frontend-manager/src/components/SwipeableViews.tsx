import { useRef, useState, useEffect, ReactNode } from 'react';

interface Props {
  activeIndex: number;
  onChangeIndex: (index: number) => void;
  children: ReactNode[];
  disabled?: boolean;
}

const SWIPE_THRESHOLD = 50;
const VELOCITY_THRESHOLD = 0.3;

export default function SwipeableViews({ activeIndex, onChangeIndex, children, disabled }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchRef = useRef<{ startX: number; startY: number; startTime: number; currentX: number; isSwiping: boolean } | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const count = children.length;

  // Reset drag offset when activeIndex changes externally (tab bar tap)
  useEffect(() => {
    setDragOffset(0);
  }, [activeIndex]);

  function handleTouchStart(e: React.TouchEvent) {
    if (disabled) return;
    const touch = e.touches[0];
    touchRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      currentX: touch.clientX,
      isSwiping: false,
    };
    setIsTransitioning(false);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!touchRef.current || disabled) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchRef.current.startX;
    const deltaY = touch.clientY - touchRef.current.startY;

    // Determine if this is a horizontal or vertical gesture
    if (!touchRef.current.isSwiping) {
      if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
        touchRef.current.isSwiping = true;
      } else if (Math.abs(deltaY) > 10) {
        // Vertical scroll — bail out
        touchRef.current = null;
        return;
      }
    }

    if (touchRef.current.isSwiping) {
      touchRef.current.currentX = touch.clientX;

      // Apply resistance at the edges
      let offset = deltaX;
      if ((activeIndex === 0 && deltaX > 0) || (activeIndex === count - 1 && deltaX < 0)) {
        offset = deltaX * 0.3; // Rubber band effect
      }

      setDragOffset(offset);
    }
  }

  function handleTouchEnd() {
    if (!touchRef.current || !touchRef.current.isSwiping || disabled) {
      touchRef.current = null;
      return;
    }

    const deltaX = touchRef.current.currentX - touchRef.current.startX;
    const elapsed = Date.now() - touchRef.current.startTime;
    const velocity = Math.abs(deltaX) / elapsed;

    setIsTransitioning(true);
    setDragOffset(0);

    // Determine if swipe was significant enough
    if (Math.abs(deltaX) > SWIPE_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
      if (deltaX < 0 && activeIndex < count - 1) {
        onChangeIndex(activeIndex + 1);
      } else if (deltaX > 0 && activeIndex > 0) {
        onChangeIndex(activeIndex - 1);
      }
    }

    touchRef.current = null;

    // Remove transition flag after animation completes
    setTimeout(() => setIsTransitioning(false), 320);
  }

  const translateX = -(activeIndex * 100) + (dragOffset / (containerRef.current?.offsetWidth || 400)) * 100;

  return (
    <div ref={containerRef} className="flex-1 min-h-0 overflow-hidden relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}>
      <div
        className="flex h-full"
        style={{
          transform: `translateX(${translateX}%)`,
          transition: isTransitioning || dragOffset === 0 ? 'transform 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
          willChange: 'transform',
        }}>
        {children.map((child, i) => (
          <div key={i} className="w-full shrink-0 h-full overflow-y-auto">
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
