/**
 * Text Splitters para Embeddings
 * 
 * Implementación de diferentes estrategias para dividir texto en chunks
 * antes de crear embeddings.
 */

export type SplitterType = 
  | 'none'
  | 'character'
  | 'recursive'
  | 'markdown'
  | 'code'
  | 'html'
  | 'token';

export interface SplitterConfig {
  chunkSize: number;
  chunkOverlap: number;
  separator?: string;
  keepSeparator?: boolean;
}

export interface ChunkResult {
  text: string;
  index: number;
  startOffset: number;
  endOffset: number;
  metadata?: Record<string, any>;
}

export interface SplitterPreview {
  chunks: ChunkResult[];
  totalChunks: number;
  avgChunkSize: number;
  minChunkSize: number;
  maxChunkSize: number;
  warnings: string[];
}

/**
 * Base class para todos los splitters
 */
abstract class BaseSplitter {
  protected config: SplitterConfig;

  constructor(config: Partial<SplitterConfig> = {}) {
    this.config = {
      chunkSize: config.chunkSize || 1000,
      chunkOverlap: config.chunkOverlap || 200,
      separator: config.separator,
      keepSeparator: config.keepSeparator ?? true,
    };
  }

  abstract split(text: string): ChunkResult[];
}

/**
 * No splitting - usa el texto completo
 */
export class NoneSplitter extends BaseSplitter {
  split(text: string): ChunkResult[] {
    return [{
      text: text.trim(),
      index: 0,
      startOffset: 0,
      endOffset: text.length,
    }];
  }
}

/**
 * Character Text Splitter
 * Divide por número fijo de caracteres
 */
export class CharacterSplitter extends BaseSplitter {
  split(text: string): ChunkResult[] {
    const chunks: ChunkResult[] = [];
    const { chunkSize, chunkOverlap } = this.config;

    let start = 0;
    let index = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      let chunkText = text.slice(start, end);

      // Buscar un buen punto de corte (espacio, newline)
      let actualEnd = end;
      if (end < text.length) {
        const lastSpace = chunkText.lastIndexOf(' ');
        const lastNewline = chunkText.lastIndexOf('\n');
        const breakPoint = Math.max(lastSpace, lastNewline);
        
        if (breakPoint > chunkSize * 0.5) {
          actualEnd = start + breakPoint + 1;
        }
      }

      chunks.push({
        text: text.slice(start, actualEnd).trim(),
        index,
        startOffset: start,
        endOffset: actualEnd,
      });

      index++;
      start = actualEnd - chunkOverlap;
      if (start <= chunks[chunks.length - 1].startOffset) {
        start = actualEnd;
      }
    }

    return chunks.filter(c => c.text.length > 0);
  }
}

/**
 * Recursive Character Text Splitter
 * Intenta mantener texto coherente dividiendo en orden de prioridad
 */
export class RecursiveCharacterSplitter extends BaseSplitter {
  private separators: string[];

  constructor(config: Partial<SplitterConfig> = {}) {
    super(config);
    this.separators = ['\n\n', '\n', '. ', ' ', ''];
  }

  split(text: string): ChunkResult[] {
    return this._splitRecursive(text, this.separators);
  }

  private _splitRecursive(text: string, separators: string[]): ChunkResult[] {
    const { chunkSize } = this.config;

    // Si el texto cabe en un chunk, retornarlo
    if (text.length <= chunkSize) {
      return [{
        text: text.trim(),
        index: 0,
        startOffset: 0,
        endOffset: text.length,
      }];
    }

    // Encontrar el mejor separador
    let bestSeparator = separators[separators.length - 1];
    for (const sep of separators) {
      if (text.includes(sep)) {
        bestSeparator = sep;
        break;
      }
    }

    // Dividir por el separador
    const parts = text.split(bestSeparator);
    const chunks: ChunkResult[] = [];
    let currentChunk = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i] + (bestSeparator && i < parts.length - 1 ? bestSeparator : '');
      
      if (currentChunk.length + part.length <= chunkSize) {
        currentChunk += part;
      } else {
        if (currentChunk.trim()) {
          chunks.push({
            text: currentChunk.trim(),
            index: chunks.length,
            startOffset: 0,
            endOffset: currentChunk.length,
          });
        }
        currentChunk = part;
      }
    }

    if (currentChunk.trim()) {
      chunks.push({
        text: currentChunk.trim(),
        index: chunks.length,
        startOffset: 0,
        endOffset: currentChunk.length,
      });
    }

    return chunks;
  }
}

/**
 * Markdown Text Splitter
 * Respeta la estructura de markdown (headers, listas, código)
 */
export class MarkdownSplitter extends BaseSplitter {
  split(text: string): ChunkResult[] {
    const { chunkSize } = this.config;
    const chunks: ChunkResult[] = [];

    // Dividir por headers primero
    const headerPattern = /^(#{1,6}\s+.+)$/gm;
    const sections = text.split(headerPattern).filter(s => s.trim());

    let currentChunk = '';

    for (const section of sections) {
      if (currentChunk.length + section.length <= chunkSize) {
        currentChunk += section;
      } else {
        if (currentChunk.trim()) {
          chunks.push({
            text: currentChunk.trim(),
            index: chunks.length,
            startOffset: 0,
            endOffset: currentChunk.length,
            metadata: { type: 'markdown_section' },
          });
        }

        if (section.length > chunkSize) {
          const subSplitter = new RecursiveCharacterSplitter(this.config);
          const subChunks = subSplitter.split(section);
          subChunks.forEach(sc => {
            sc.index = chunks.length;
            sc.metadata = { type: 'markdown_section' };
            chunks.push(sc);
          });
          currentChunk = '';
        } else {
          currentChunk = section;
        }
      }
    }

    if (currentChunk.trim()) {
      chunks.push({
        text: currentChunk.trim(),
        index: chunks.length,
        startOffset: 0,
        endOffset: currentChunk.length,
        metadata: { type: 'markdown_section' },
      });
    }

    return chunks;
  }
}

/**
 * Code Text Splitter
 * Intenta dividir código de manera inteligente
 */
export class CodeSplitter extends BaseSplitter {
  split(text: string): ChunkResult[] {
    const { chunkSize } = this.config;
    const chunks: ChunkResult[] = [];

    // Dividir por líneas vacías o funciones/clases
    const lines = text.split('\n');
    let currentChunk = '';
    let braceCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Contar llaves para detectar bloques de código
      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;

      if (currentChunk.length + line.length + 1 <= chunkSize) {
        currentChunk += line + '\n';
      } else {
        // Intentar no cortar en medio de un bloque
        if (braceCount > 0) {
          currentChunk += line + '\n';
          continue;
        }

        if (currentChunk.trim()) {
          chunks.push({
            text: currentChunk.trim(),
            index: chunks.length,
            startOffset: 0,
            endOffset: currentChunk.length,
            metadata: { type: 'code_block' },
          });
        }
        currentChunk = line + '\n';
      }
    }

    if (currentChunk.trim()) {
      chunks.push({
        text: currentChunk.trim(),
        index: chunks.length,
        startOffset: 0,
        endOffset: currentChunk.length,
        metadata: { type: 'code_block' },
      });
    }

    return chunks;
  }
}

/**
 * HTML to Markdown Splitter
 * Convierte HTML a texto y luego divide
 */
export class HtmlSplitter extends BaseSplitter {
  split(text: string): ChunkResult[] {
    // Convertir HTML a texto simple
    let cleanText = text
      // Remover scripts y styles
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      // Convertir headers
      .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n## $1\n')
      // Convertir párrafos
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n')
      // Convertir divs
      .replace(/<div[^>]*>(.*?)<\/div>/gi, '\n$1\n')
      // Convertir listas
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
      // Remover tags restantes
      .replace(/<[^>]+>/g, '')
      // Decodificar entidades HTML básicas
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      // Limpiar espacios extra
      .replace(/\n\s*\n/g, '\n\n')
      .trim();

    // Usar RecursiveCharacterSplitter para el texto limpio
    const splitter = new RecursiveCharacterSplitter(this.config);
    return splitter.split(cleanText);
  }
}

/**
 * Token Text Splitter (aproximación)
 * Divide basándose en tokens aproximados (4 chars ≈ 1 token)
 */
export class TokenSplitter extends BaseSplitter {
  private tokensPerChunk: number;

  constructor(config: Partial<SplitterConfig> = {}) {
    super(config);
    // Aproximación: 4 caracteres = 1 token
    this.tokensPerChunk = Math.floor((config.chunkSize || 1000) / 4);
  }

  split(text: string): ChunkResult[] {
    const { chunkOverlap } = this.config;
    const chunks: ChunkResult[] = [];

    // Tokenizar de manera simple (por palabras)
    const words = text.split(/(\s+)/);
    let currentTokens = 0;
    let currentText = '';

    for (const word of words) {
      const wordTokens = Math.ceil(word.length / 4);

      if (currentTokens + wordTokens <= this.tokensPerChunk) {
        currentText += word;
        currentTokens += wordTokens;
      } else {
        if (currentText.trim()) {
          chunks.push({
            text: currentText.trim(),
            index: chunks.length,
            startOffset: 0,
            endOffset: currentText.length,
            metadata: { tokens: currentTokens },
          });
        }
        currentText = word;
        currentTokens = wordTokens;
      }
    }

    if (currentText.trim()) {
      chunks.push({
        text: currentText.trim(),
        index: chunks.length,
        startOffset: 0,
        endOffset: currentText.length,
        metadata: { tokens: currentTokens },
      });
    }

    return chunks;
  }
}

/**
 * Factory para crear splitters
 */
export function createSplitter(
  type: SplitterType,
  config: Partial<SplitterConfig> = {}
): BaseSplitter {
  switch (type) {
    case 'none':
      return new NoneSplitter(config);
    case 'character':
      return new CharacterSplitter(config);
    case 'recursive':
      return new RecursiveCharacterSplitter(config);
    case 'markdown':
      return new MarkdownSplitter(config);
    case 'code':
      return new CodeSplitter(config);
    case 'html':
      return new HtmlSplitter(config);
    case 'token':
      return new TokenSplitter(config);
    default:
      return new RecursiveCharacterSplitter(config);
  }
}

/**
 * Genera preview de chunks con estadísticas
 */
export function previewChunks(
  text: string,
  splitterType: SplitterType,
  config: Partial<SplitterConfig> = {}
): SplitterPreview {
  const splitter = createSplitter(splitterType, config);
  const chunks = splitter.split(text);
  const warnings: string[] = [];

  // Calcular estadísticas
  const sizes = chunks.map(c => c.text.length);
  const avgChunkSize = sizes.length > 0 
    ? Math.round(sizes.reduce((a, b) => a + b, 0) / sizes.length) 
    : 0;
  const minChunkSize = sizes.length > 0 ? Math.min(...sizes) : 0;
  const maxChunkSize = sizes.length > 0 ? Math.max(...sizes) : 0;

  // Generar advertencias
  if (chunks.length === 0) {
    warnings.push('No se generaron chunks. El texto puede estar vacío.');
  }
  if (maxChunkSize > (config.chunkSize || 1000) * 1.5) {
    warnings.push(`Algunos chunks exceden el tamaño máximo (${maxChunkSize} chars).`);
  }
  if (minChunkSize < 50 && chunks.length > 1) {
    warnings.push('Algunos chunks son muy cortos y podrían no tener suficiente contexto.');
  }
  if (chunks.length > 100) {
    warnings.push('Se generarán muchos chunks. Considera aumentar el chunkSize.');
  }

  return {
    chunks,
    totalChunks: chunks.length,
    avgChunkSize,
    minChunkSize,
    maxChunkSize,
    warnings,
  };
}

/**
 * Información sobre cada tipo de splitter
 */
export const SPLITTER_INFO: Record<SplitterType, {
  name: string;
  description: string;
  bestFor: string[];
  recommended: boolean;
}> = {
  none: {
    name: 'Sin división',
    description: 'Usa el texto completo sin dividir',
    bestFor: ['Textos muy cortos (< 500 caracteres)', 'Títulos', 'Descripciones breves'],
    recommended: false,
  },
  character: {
    name: 'Character Text Splitter',
    description: 'Divide por número fijo de caracteres',
    bestFor: ['Texto simple sin estructura', 'Datos estructurados', 'Logs'],
    recommended: false,
  },
  recursive: {
    name: 'Recursive Character Splitter',
    description: 'Intenta mantener párrafos y oraciones juntos',
    bestFor: ['Texto narrativo', 'Artículos', 'Historias', 'Documentos generales'],
    recommended: true,
  },
  markdown: {
    name: 'Markdown Text Splitter',
    description: 'Respeta la estructura de markdown (headers, listas, código)',
    bestFor: ['Documentación', 'README', 'Notas en markdown', 'Wikis'],
    recommended: true,
  },
  code: {
    name: 'Code Text Splitter',
    description: 'Divide código intentando mantener funciones completas',
    bestFor: ['Código fuente', 'Scripts', 'Configuraciones técnicas'],
    recommended: false,
  },
  html: {
    name: 'HTML to Markdown Splitter',
    description: 'Convierte HTML a texto y luego divide',
    bestFor: ['Páginas web', 'Contenido HTML', 'Emails'],
    recommended: false,
  },
  token: {
    name: 'Token Text Splitter',
    description: 'Divide por tokens (aproximación)',
    bestFor: ['Texto para LLMs', 'Prompts largos', 'Chat history'],
    recommended: false,
  },
};

export default {
  createSplitter,
  previewChunks,
  SPLITTER_INFO,
};
