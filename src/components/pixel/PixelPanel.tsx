import React from 'react';

interface PixelPanelProps {
  variant?: 'default' | 'bronze' | 'gold';
  padding?: 'sm' | 'md' | 'lg';
  className?: string;
  children: React.ReactNode;
}

export function PixelPanel({
  variant = 'default',
  padding = 'md',
  className = '',
  children,
}: PixelPanelProps) {
  const baseClasses = 'pixel-panel';
  
  const variantClasses = {
    default: '',
    bronze: 'pixel-panel-bronze',
    gold: '',
  };

  const paddingClasses = {
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6',
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  );
}
