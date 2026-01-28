/**
 * Utility functions for prompt processing
 * These functions are pure utilities that can be used in both server and client code
 */

/**
 * Extracts sections from a prompt formatted with === SECTION === headers
 * @param prompt - The full prompt text
 * @returns Array of sections with label, content, and background color
 */
export function extractPromptSections(prompt: string): Array<{
  label: string;
  content: string;
  bgColor: string;
}> {
  const sections: Array<{ label: string; content: string; bgColor: string }> = [];

  // Mapeo de secciones a sus colores
  const sectionColors: Record<string, string> = {
    'Instrucción': 'bg-blue-50 dark:bg-blue-950',
    'INSTRUCCIÓN INICIAL': 'bg-blue-50 dark:bg-blue-950',
    'INSTRUCCIONES INICIALES': 'bg-blue-50 dark:bg-blue-950',
    'MAIN PROMPT': 'bg-green-50 dark:bg-green-950',
    'DESCRIPCIÓN': 'bg-emerald-50 dark:bg-emerald-950',
    'PERSONALIDAD': 'bg-teal-50 dark:bg-teal-950',
    'ESCENARIO': 'bg-purple-50 dark:bg-purple-950',
    'EJEMPLOS DE CHAT': 'bg-pink-50 dark:bg-pink-950',
    'LAST USER MESSAGE': 'bg-slate-50 dark:bg-slate-950',
    'INSTRUCCIONES POST-HISTORIAL': 'bg-red-50 dark:bg-red-950',
    'INSTRUCCIONES POST-HISTORY': 'bg-red-50 dark:bg-red-950',
    'POST-HISTORY': 'bg-red-50 dark:bg-red-950',
    'TIPO DE LORE': 'bg-teal-50 dark:bg-teal-950',
    'CONTEXTO': 'bg-orange-50 dark:bg-orange-950',
    'RESUMENES': 'bg-yellow-50 dark:bg-yellow-950',
    'NOMBRE': 'bg-blue-50 dark:bg-blue-950',
    'SISTEMA': 'bg-indigo-50 dark:bg-indigo-950'
  };

  // ✅ Extraer la primera sección (instrucción inicial) antes del primer encabezado
  const sectionPattern = /===\s*(.+?)\s*===/g;
  
  // Buscar todos los encabezados de sección en el prompt
  const allMatches = [...prompt.matchAll(sectionPattern)];
  
  if (allMatches.length === 0) {
    // No hay encabezados, devolver el contenido completo como una sola sección
    if (prompt.trim().length > 0) {
      sections.push({
        label: 'Prompt Completo',
        content: prompt.trim(),
        bgColor: 'bg-gray-50 dark:bg-gray-950'
      });
    }
  } else {
    // Hay encabezados, procesar cada sección
    for (let i = 0; i < allMatches.length; i++) {
      const match = allMatches[i];
      const sectionLabel = match[1].trim();
      const sectionStart = match.index!;
      const sectionHeaderEnd = sectionStart + match[0].length;
      const nextMatch = allMatches[i + 1];
      const sectionEnd = nextMatch ? nextMatch.index : prompt.length;

      if (i === 0 && sectionStart > 0) {
        // Primera sección: contenido antes del primer encabezado (Instrucción Inicial)
        const beforeFirstHeader = prompt.slice(0, sectionStart).trim();
        if (beforeFirstHeader.length > 0) {
          sections.push({
            label: 'Instrucción Inicial',
            content: beforeFirstHeader,
            bgColor: 'bg-blue-50 dark:bg-blue-950'
          });
        }
      }

      // Obtener el contenido de la sección (después del encabezado, antes del siguiente)
      const sectionContent = prompt.slice(sectionHeaderEnd, sectionEnd).trim();

      // Usar color conocido o un color por defecto
      const bgColor = sectionColors[sectionLabel] || 'bg-gray-50 dark:bg-gray-950';

      sections.push({
        label: sectionLabel,
        content: sectionContent,
        bgColor
      });
    }
  }

  // Si no se encontraron secciones válidas, devolver el contenido completo
  if (sections.length === 0) {
    sections.push({
      label: 'Prompt Completo',
      content: prompt,
      bgColor: 'bg-gray-50 dark:bg-gray-950'
    });
  }

  return sections;
}
