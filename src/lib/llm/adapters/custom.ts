// ============================================
// ADAPTER CUSTOM (cualquier endpoint OpenAI-compatible)
// - LM Studio, vLLM, Text Generation WebUI, etc.
// - Sin API key (opcional)
// ============================================

import { OpenAIAdapter } from './openai';

export class CustomAdapter extends OpenAIAdapter {
  // Custom hereda todo el comportamiento de OpenAI.
  // Se diferencia solo conceptualmente para la UI (sin modelos predefinidos).
}
