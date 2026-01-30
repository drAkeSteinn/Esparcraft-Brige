import React from 'react';
import { Loader2 } from 'lucide-react';

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
  const baseClasses = 'pixel-button font-press-start uppercase tracking-wider transition-all duration-100';

  const variantClasses = {
    default: '',
    primary: 'pixel-button-primary',
    destructive: 'pixel-button-destructive',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className} ${isLoading || disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Cargando...
        </span>
      ) : (
        children
      )}
    </button>
  );
}
