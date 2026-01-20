'use client';

import { Embedding } from '@/lib/embeddings/types';

interface DocumentCardProps {
  embedding: Embedding;
  score?: number;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function DocumentCard({ 
  embedding, 
  score, 
  onView, 
  onEdit, 
  onDelete 
}: DocumentCardProps) {
  const createdAt = new Date(embedding.created_at).toLocaleString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div 
      className="border rounded-lg p-4 hover:bg-accent/50 cursor-pointer transition-all space-y-3"
      onClick={onView}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm line-clamp-1">
            {embedding.metadata?.title || embedding.content.slice(0, 60)}
          </h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">
              {embedding.namespace}
            </span>
            {embedding.source_type && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground capitalize">
                  {embedding.source_type}
                </span>
              </>
            )}
            {embedding.source_id && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground font-mono">
                  {embedding.source_id.slice(0, 12)}
                </span>
              </>
            )}
          </div>
        </div>
        
        {score !== undefined && (
          <div 
            className={`text-xs font-bold px-2 py-1 rounded ${
              score > 0.8 
                ? 'bg-green-500 text-white' 
                : score > 0.6 
                  ? 'bg-yellow-500 text-white' 
                  : 'bg-gray-500 text-white'
            }`}
          >
            {Math.round(score * 100)}%
          </div>
        )}
      </div>

      {/* Content Preview */}
      <p className="text-sm text-muted-foreground line-clamp-3">
        {embedding.content}
      </p>

      {/* Metadata */}
      {embedding.metadata && Object.keys(embedding.metadata).length > 0 && (
        <div className="space-y-1">
          {embedding.metadata.category && (
            <span className="text-xs px-2 py-0.5 bg-secondary rounded">
              {embedding.metadata.category}
            </span>
          )}
          {embedding.metadata.tags && Array.isArray(embedding.metadata.tags) && (
            <div className="flex flex-wrap gap-1">
              {embedding.metadata.tags.slice(0, 3).map((tag: string, i: number) => (
                <span 
                  key={i} 
                  className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t">
        <span className="text-xs text-muted-foreground">
          {createdAt}
        </span>
        <div className="flex gap-1">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="text-xs p-1 hover:text-primary transition-colors"
            >
              Editar
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-xs p-1 hover:text-destructive transition-colors"
            >
              Eliminar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default DocumentCard;
