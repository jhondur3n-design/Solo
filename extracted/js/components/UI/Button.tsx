import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
  glow?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  className = '',
  glow = true,
  ...props
}) => {
  const baseClasses = `
    relative px-4 py-2 rounded-md font-semibold text-sm md:text-base
    overflow-hidden
    group
    transition-all duration-300 ease-in-out
  `;

  const variantClasses = {
    primary: `
      bg-blue-700 hover:bg-blue-600
      text-white
      border border-blue-500
      ${glow ? 'shadow-blue-500/50 hover:shadow-blue-400/70' : ''}
    `,
    secondary: `
      bg-gray-700 hover:bg-gray-600
      text-gray-200
      border border-gray-500
      ${glow ? 'shadow-gray-500/30 hover:shadow-gray-400/50' : ''}
    `,
    danger: `
      bg-red-700 hover:bg-red-600
      text-white
      border border-red-500
      ${glow ? 'shadow-red-500/50 hover:shadow-red-400/70' : ''}
    `,
  }[variant];

  return (
    <button
      className={`${baseClasses} ${variantClasses} ${className}`}
      {...props}
    >
      <span className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-blue-400/50 to-blue-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></span>
      <span className="relative z-10">{children}</span>
    </button>
  );
};

export default Button;
