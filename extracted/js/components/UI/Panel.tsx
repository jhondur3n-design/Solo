import React from 'react';

interface PanelProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  neonColor?: string;
  isFloating?: boolean;
}

const Panel: React.FC<PanelProps> = ({
  title,
  children,
  className = '',
  neonColor = 'cyan', // Tailwind color name like 'blue', 'cyan', 'indigo'
  isFloating = false,
}) => {
  const neonClass = {
    blue: 'shadow-blue-500/50',
    cyan: 'shadow-cyan-400/50',
    indigo: 'shadow-indigo-500/50',
  }[neonColor] || 'shadow-blue-500/50';

  const titleNeonClass = {
    blue: 'text-blue-300',
    cyan: 'text-cyan-300',
    indigo: 'text-indigo-300',
  }[neonColor] || 'text-blue-300';

  const floatingClass = isFloating ? 'animate-[float_5s_ease-in-out_infinite] hover:animate-none' : '';

  return (
    <div
      className={`
        relative
        bg-gray-800/70 backdrop-blur-sm
        border border-blue-700/50
        rounded-lg
        p-4 md:p-6
        flex flex-col
        ${neonClass} transition-all duration-300 ease-in-out
        ${floatingClass}
        ${className}
        overflow-hidden
        aura-effect
      `}
      style={{ willChange: isFloating ? 'transform, box-shadow' : 'box-shadow' }}
    >
      {/* Top-left corner glow */}
      <div className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-blue-500 opacity-20 filter blur-sm"></div>
      {/* Bottom-right corner glow */}
      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-cyan-500 opacity-20 filter blur-sm"></div>

      {title && (
        <h2 className={`text-xl md:text-2xl font-bold mb-4 ${titleNeonClass} neon-text`}>
          {title}
        </h2>
      )}
      <div className="flex-grow overflow-y-auto custom-scrollbar">
        {children}
      </div>
    </div>
  );
};

export default Panel;