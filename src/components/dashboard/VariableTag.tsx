'use client';

import { Badge } from '@/components/ui/badge';

interface VariableTagProps {
  variableKey: string;
  className?: string;
}

/**
 * Componente para mostrar etiquetas de variables {{variable}}
 * con el estilo pixel art del tema Dark Fantasy
 */
export default function VariableTag({ variableKey, className = '' }: VariableTagProps) {
  return (
    <Badge 
      variant="outline" 
      className={`
        font-mono text-xs px-2 py-0.5
        border-2 border-fantasy-textured
        bg-fantasy-deep-black
        text-gold-light
        shadow-pixel-hard
        ${className}
      `}
      style={{
        borderColor: '#2C2923',
        textShadow: '1px 1px 0px rgba(0, 0, 0, 1)',
      }}
    >
      {`{{${variableKey}}}`}
    </Badge>
  );
}
