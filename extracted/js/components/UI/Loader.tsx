import React from 'react';

interface LoaderProps {
  message?: string;
  isLoading: boolean;
}

const Loader: React.FC<LoaderProps> = ({ message = 'LOADING SYSTEM...', isLoading }) => {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-90 solo-leveling-gradient">
      <div className="relative w-24 h-24 md:w-32 md:h-32 flex items-center justify-center mb-6">
        {/* Inner core */}
        <div className="absolute w-12 h-12 md:w-16 md:h-16 rounded-full bg-blue-600 animate-pulse opacity-70" style={{ willChange: 'opacity, transform' }}></div>
        {/* Outer rings */}
        <div className="absolute w-full h-full rounded-full border-4 border-blue-500 opacity-50 animate-spin-slow" style={{ willChange: 'transform' }}></div>
        <div className="absolute w-full h-full rounded-full border-4 border-cyan-400 opacity-40 animate-spin-fast reverse" style={{ willChange: 'transform' }}></div>
      </div>
      <p className="text-xl md:text-2xl text-cyan-300 neon-text animate-pulse">
        {message}
      </p>
    </div>
  );
};

export default Loader;