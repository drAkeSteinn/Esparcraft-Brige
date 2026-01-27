import { useState, useCallback } from 'react';

/**
 * Hook para hacer previews de prompts usando el backend
 * Llama al endpoint /api/reroute?preview=true
 */
export function usePromptPreview() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewPrompt = useCallback(async (payload: any) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/reroute?preview=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`HTTP error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Error en preview del prompt');
      }

      return data.data; // { systemPrompt, messages, lastPrompt, sections }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { previewPrompt, loading, error };
}
