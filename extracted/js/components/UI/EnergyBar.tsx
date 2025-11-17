import React from 'react';

interface EnergyBarProps {
  value: number; // 0-100
  max: number;
  label?: string;
  className?: string;
  color?: string; // Tailwind color classes, e.g., 'bg-green-500'
}

const EnergyBar: React.FC<EnergyBarProps> = ({
  value,
  max,
  label,
  className = '',
  color = 'bg-cyan-500',
}) => {
  const percentage = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div className={`w-full ${className}`}>
      {label && <div className="text-sm text-gray-300 mb-1">{label}</div>}
      <div className="relative w-full h-4 md:h-6 bg-gray-700 rounded-full border border-blue-600 overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-300 ease-out aura-effect`}
          style={{ width: `${percentage}%` }}
        ></div>
        <div className="absolute inset-0 flex items-center justify-center text-xs md:text-sm font-bold text-gray-900 mix-blend-screen">
          {Math.round(value)} / {max}
        </div>
      </div>
    </div>
  );
};

export default EnergyBar;
