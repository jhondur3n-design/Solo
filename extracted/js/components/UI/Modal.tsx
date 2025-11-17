import React from 'react';
import Button from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  persistent?: boolean; // If true, modal cannot be closed by clicking outside or escape
  className?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  actions,
  persistent = false,
  className = '',
}) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (!persistent && e.target === e.currentTarget && onClose) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm p-4"
      onClick={handleOverlayClick}
    >
      <div
        className={`
          bg-gray-800/90 border border-blue-700/50 rounded-lg shadow-2xl
          shadow-blue-500/50
          p-6 md:p-8 w-full max-w-lg lg:max-w-xl
          flex flex-col
          transform transition-all duration-300 scale-100 opacity-100
          ${className}
          aura-effect
        `}
        style={{ willChange: 'transform, opacity' }}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        <h3 className="text-2xl md:text-3xl font-bold text-cyan-300 neon-text mb-4 border-b border-blue-600 pb-2">
          {title}
        </h3>
        <div className="flex-grow overflow-y-auto custom-scrollbar text-gray-200 mb-6 text-sm md:text-base">
          {children}
        </div>
        <div className="flex justify-end space-x-4">
          {actions || (
            !persistent && onClose && <Button onClick={onClose} variant="secondary">Close</Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;