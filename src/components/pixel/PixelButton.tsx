import React from 'react';

interface PixelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

export function PixelButton({
  variant = 'default',
  size = 'md',
  isLoading = false,
  disabled,
  children,
  className = '',
  ...props
}: PixelButtonProps) {
  const baseClasses = 'pixel-button font-press-start cursor-pointer transition-all';
  
  const variantClasses = {
    default: '',
    primary: 'pixel-button-primary',
    destructive: 'border-[#8B3A3A] hover:bg-[#8B3A3A]',
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="inline-block animate-pulse">Cargando...</span>
      ) : (
        children
      )}
    </button>
  );
}
