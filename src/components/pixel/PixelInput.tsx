import React from 'react';

interface PixelInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  type?: 'input' | 'textarea';
}

export function PixelInput({
  label,
  error,
  type = 'input',
  className = '',
  id,
  ...props
}: PixelInputProps) {
  const baseInputClasses = 'pixel-input bg-fantasy-charcoal border-2 border-fantasy-textured text-foreground font-vt323 focus:outline-none resize-none placeholder:text-fantasy-bronze';

  const errorClasses = error ? 'border-[#8B3A3A]' : '';

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={id} className="block font-press-start text-xs text-gold-main uppercase tracking-wider">
          {label}
        </label>
      )}
      {type === 'textarea' ? (
        <textarea
          id={id}
          className={`${baseInputClasses} ${errorClasses} ${className}`}
          {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          id={id}
          type="text"
          className={`${baseInputClasses} ${errorClasses} ${className}`}
          {...props}
        />
      )}
      {error && (
        <p className="text-xs text-[#8B3A3A] font-vt323">{error}</p>
      )}
    </div>
  );
}
