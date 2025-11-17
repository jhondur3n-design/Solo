import React from 'react';

interface HUDOverlayProps {
  children?: React.ReactNode;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
}

const HUDOverlay: React.FC<HUDOverlayProps> = ({
  children,
  position = 'top-left',
  className = '',
}) => {
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  }[position];

  return (
    <div
      className={`
        fixed
        ${positionClasses}
        z-50
        p-2
        bg-gray-800/60 backdrop-blur-sm
        border border-blue-700/50 rounded-lg
        shadow-lg shadow-blue-500/30
        neon-text text-blue-300
        text-xs md:text-sm
        pointer-events-none
        animate-[float_7s_ease-in-out_infinite_reverse]
        ${className}
      `}
      style={{ willChange: 'transform, opacity' }}
    >
      {children || (
        <div className="flex flex-col space-y-1">
          <span>[SYSTEM // ACTIVE]</span>
          <span>[STATUS // ONLINE]</span>
          <span>[ENERGY // STABLE]</span>
        </div>
      )}
    </div>
  );
};

export default HUDOverlay;