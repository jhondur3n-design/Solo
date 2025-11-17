import React, { useRef, useState, useCallback, useEffect } from 'react';

interface DialProps {
  label: string;
  value: number;
  onChange: (newValue: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
}

const Dial: React.FC<DialProps> = ({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  className = '',
}) => {
  const dialRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [initialCoord, setInitialCoord] = useState(0); // For both mouse and touch
  const [initialValue, setInitialValue] = useState(0);

  const angle = ((value - min) / (max - min)) * 270 - 135; // -135 to 135 degrees for a 270-degree arc

  const startDrag = useCallback((clientY: number) => {
    setIsDragging(true);
    setInitialCoord(clientY);
    setInitialValue(value);
  }, [value]);

  const onDrag = useCallback((clientY: number) => {
    if (!isDragging) return;

    const deltaY = initialCoord - clientY;
    // Adjust sensitivity
    const newValue = initialValue + Math.round(deltaY / 5) * step;
    const clampedValue = Math.max(min, Math.min(max, newValue));
    onChange(clampedValue);
  }, [isDragging, initialCoord, initialValue, min, max, step, onChange]);

  const stopDrag = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Mouse Handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    startDrag(e.clientY);
  }, [startDrag]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    onDrag(e.clientY);
  }, [onDrag]);

  const handleMouseUp = useCallback(() => {
    stopDrag();
  }, [stopDrag]);

  // Touch Handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      startDrag(e.touches[0].clientY);
    }
  }, [startDrag]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 1) {
      onDrag(e.touches[0].clientY);
    }
  }, [onDrag]);

  const handleTouchEnd = useCallback(() => {
    stopDrag();
  }, [stopDrag]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="text-sm text-blue-300 mb-2">{label}</div>
      <div
        ref={dialRef}
        className="relative w-20 h-20 md:w-24 md:h-24 rounded-full bg-gray-700 border-2 border-blue-600 shadow-lg cursor-grab active:cursor-grabbing select-none
                   flex items-center justify-center
                   group"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        style={{
          boxShadow: `0 0 10px rgba(0, 150, 255, 0.5), inset 0 0 5px rgba(0, 150, 255, 0.3)`
        }}
      >
        {/* Dial indicator */}
        <div
          className="absolute w-2 h-2 rounded-full bg-cyan-300 transition-transform duration-100 ease-linear
                     origin-center transform -translate-y-8 md:-translate-y-10 group-hover:bg-cyan-100"
          style={{ transform: `rotate(${angle}deg) translateY(-32px) translateY(-10%)`, willChange: 'transform' }}
        ></div>
        {/* Center glowing circle */}
        <div className="w-8 h-8 rounded-full bg-blue-500 opacity-70 blur-sm absolute"></div>
        <div className="w-8 h-8 rounded-full bg-blue-700 border border-cyan-400 absolute flex items-center justify-center">
            <span className="text-blue-100 text-sm md:text-lg font-bold">
                {value}
            </span>
        </div>
      </div>
    </div>
  );
};

export default Dial;