import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Sliders, 
  ChevronsLeft, 
  ChevronsRight,
  MoveHorizontal
} from 'lucide-react';

interface HorizontalSliderProps {
  targetRef: React.RefObject<HTMLElement | null>;
  label?: string;
  className?: string;
  stepAmount?: number;
  showQuickJumps?: boolean;
}

export const HorizontalSlider: React.FC<HorizontalSliderProps> = ({
  targetRef,
  label = 'Horizontal Pan Slider',
  className = '',
  stepAmount = 240,
  showQuickJumps = true,
}) => {
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);
  const [canScrollRight, setCanScrollRight] = useState<boolean>(false);
  const [hasOverflow, setHasOverflow] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const isInternalScroll = useRef<boolean>(false);

  // Measure and update scroll state
  const updateScrollState = useCallback(() => {
    const el = targetRef.current;
    if (!el) return;

    const maxScroll = el.scrollWidth - el.clientWidth;
    const overflow = maxScroll > 4; // allow small threshold for rounding
    setHasOverflow(overflow);

    if (maxScroll <= 0) {
      setScrollProgress(0);
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    const current = el.scrollLeft;
    const pct = Math.min(100, Math.max(0, (current / maxScroll) * 100));
    setScrollProgress(pct);
    setCanScrollLeft(current > 4);
    setCanScrollRight(current < maxScroll - 4);
  }, [targetRef]);

  // Sync scroll listener
  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;

    const handleScroll = () => {
      if (isInternalScroll.current) return;
      updateScrollState();
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', updateScrollState);

    // ResizeObserver for dynamic column or content width changes
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        updateScrollState();
      });
      ro.observe(el);
      if (el.firstElementChild) {
        ro.observe(el.firstElementChild);
      }
    }

    // Initial check
    updateScrollState();
    const timer = setTimeout(updateScrollState, 150);

    return () => {
      el.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateScrollState);
      if (ro) ro.disconnect();
      clearTimeout(timer);
    };
  }, [targetRef, updateScrollState]);

  // Programmatic scroll
  const scrollToPercent = (percent: number, smooth: boolean = true) => {
    const el = targetRef.current;
    if (!el) return;

    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) return;

    const targetLeft = (percent / 100) * maxScroll;
    isInternalScroll.current = true;
    setScrollProgress(percent);

    if (smooth) {
      el.scrollTo({ left: targetLeft, behavior: 'smooth' });
      // Reset lock after animation
      setTimeout(() => {
        isInternalScroll.current = false;
        updateScrollState();
      }, 300);
    } else {
      el.scrollLeft = targetLeft;
      isInternalScroll.current = false;
      updateScrollState();
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setScrollProgress(val);
    scrollToPercent(val, false);
  };

  const handleStep = (direction: 'left' | 'right') => {
    const el = targetRef.current;
    if (!el) return;

    const current = el.scrollLeft;
    const delta = direction === 'left' ? -stepAmount : stepAmount;
    el.scrollBy({ left: delta, behavior: 'smooth' });
    setTimeout(updateScrollState, 250);
  };

  const handleJump = (target: 'start' | 'center' | 'end') => {
    if (target === 'start') scrollToPercent(0, true);
    else if (target === 'center') scrollToPercent(50, true);
    else if (target === 'end') scrollToPercent(100, true);
  };

  // If there's genuinely no overflow on large screens, render a quiet, compact bar
  // allowing the user to see that the full width is visible
  if (!hasOverflow) {
    return null;
  }

  const roundedPct = Math.round(scrollProgress);

  return (
    <div 
      className={`bg-stone-50/95 border border-stone-200/90 rounded-xl p-2.5 shadow-2xs backdrop-blur-xs flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-stone-700 transition-all ${className}`}
      data-testid="horizontal-slider-control"
    >
      {/* Left indicator & Title */}
      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
        <div className="flex items-center gap-1.5 font-semibold text-stone-800">
          <MoveHorizontal className="w-4 h-4 text-indigo-600 animate-pulse" />
          <span className="text-[11px] font-bold uppercase tracking-wide text-stone-700">
            {label}
          </span>
        </div>
        <span className="font-mono text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded-full">
          {roundedPct}% panned
        </span>
      </div>

      {/* Center Slider Bar & Nudge Buttons */}
      <div className="flex items-center gap-2 w-full sm:max-w-md md:max-w-lg flex-1">
        {/* Nudge Left */}
        <button
          type="button"
          onClick={() => handleStep('left')}
          disabled={!canScrollLeft}
          title="Scroll Left (Step)"
          className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0 shadow-2xs"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Interactive Track & Range Slider */}
        <div className="relative flex-1 flex items-center py-1">
          <input
            type="range"
            min={0}
            max={100}
            step={0.5}
            value={scrollProgress}
            onChange={handleSliderChange}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onTouchStart={() => setIsDragging(true)}
            onTouchEnd={() => setIsDragging(false)}
            aria-label="Horizontal scroll position"
            className="w-full h-2.5 bg-stone-200 rounded-lg appearance-none cursor-ew-resize accent-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            style={{
              background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${scrollProgress}%, #e7e5e4 ${scrollProgress}%, #e7e5e4 100%)`,
            }}
          />
        </div>

        {/* Nudge Right */}
        <button
          type="button"
          onClick={() => handleStep('right')}
          disabled={!canScrollRight}
          title="Scroll Right (Step)"
          className="p-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0 shadow-2xs"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Right Quick Jump Buttons */}
      {showQuickJumps && (
        <div className="flex items-center gap-1 shrink-0 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => handleJump('start')}
            disabled={!canScrollLeft}
            className="px-2 py-1 text-[11px] font-medium bg-white hover:bg-stone-100 border border-stone-200 rounded-md text-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-0.5"
            title="Jump to Start"
          >
            <ChevronsLeft className="w-3 h-3" />
            <span className="hidden md:inline">Start</span>
          </button>
          <button
            type="button"
            onClick={() => handleJump('center')}
            className="px-2 py-1 text-[11px] font-medium bg-white hover:bg-stone-100 border border-stone-200 rounded-md text-stone-700 transition-colors cursor-pointer"
            title="Jump to Center"
          >
            Center
          </button>
          <button
            type="button"
            onClick={() => handleJump('end')}
            disabled={!canScrollRight}
            className="px-2 py-1 text-[11px] font-medium bg-white hover:bg-stone-100 border border-stone-200 rounded-md text-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-0.5"
            title="Jump to End"
          >
            <span className="hidden md:inline">End</span>
            <ChevronsRight className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
