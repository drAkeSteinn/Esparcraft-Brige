/**
 * SISTEMA DE PLANTILLAS PERSONALIZADAS
 * 
 * Permite crear y gestionar plantillas personalizadas con variables
 * Las plantillas se pueden guardar, cargar, versionar y aplicar
 */

import { replaceVariables, VariableContext } from './utils';
import { validateTemplate } from './validateVariables';
import { extractVariablesFromText } from './VARIABLE_GLOSSARY';

export interface CustomTemplate {
  /** ID único de la plantilla */
  id: string;
  /** Nombre de la plantilla */
  name: string;
  /** Descripción de la plantilla */
  description: string;
  /** Contenido de la plantilla con variables */
  content: string;
  /** Variables utilizadas en la plantilla */
  variables: string[];
  /** Categoría de la plantilla */
  category: 'user' | 'npc' | 'system' | 'custom';
  /** Versión de la plantilla */
  version: string;
  /** Etiquetas para organización */
  tags: string[];
  /** Fecha de creación */
  createdAt: string;
  /** Fecha de última actualización */
  updatedAt: string;
  /** ¿Está activa? */
  active: boolean;
  /** ID del creador (opcional) */
  createdBy?: string;
}

export interface TemplateRenderOptions {
  /** ¿Validar antes de renderizar? */
  validate?: boolean;
  /** ¿Lanzar error si hay variables faltantes? */
  throwOnError?: boolean;
  /** ¿Mostrar marcadores para variables no encontradas? */
  showPlaceholders?: boolean;
}

export interface TemplateRenderResult {
  /** Contenido renderizado */
  content: string;
  /** ¿La renderización fue exitosa? */
  success: boolean;
  /** Variables encontradas */
  variablesFound: string[];
  /** Variables reemplazadas */
  variablesReplaced: string[];
  /** Variables no encontradas */
  variablesNotFound: string[];
  /** Errores */
  errors: string[];
}

/**
 * Manager de plantillas personalizadas
 */
export class CustomTemplateManager {
  private templates: Map<string, CustomTemplate> = new Map();

  /**
   * Crea una nueva plantilla
   */
  createTemplate(
    name: string,
    content: string,
    options: Partial<Omit<CustomTemplate, 'id' | 'name' | 'content' | 'variables' | 'createdAt' | 'updatedAt'>> = {}
  ): CustomTemplate {
    const id = this.generateId();
    const now = new Date().toISOString();

    const template: CustomTemplate = {
      id,
      name,
      content,
      variables: extractVariablesFromText(content),
      category: options.category || 'custom',
      description: options.description || '',
      version: options.version || '1.0.0',
      tags: options.tags || [],
      active: options.active ?? true,
      createdBy: options.createdBy,
      createdAt: now,
      updatedAt: now
    };

    this.templates.set(id, template);
    return template;
  }

  /**
   * Obtiene una plantilla por ID
   */
  getTemplate(id: string): CustomTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Obtiene una plantilla por nombre
   */
  getTemplateByName(name: string): CustomTemplate | undefined {
    for (const template of this.templates.values()) {
      if (template.name === name) {
        return template;
      }
    }
    return undefined;
  }

  /**
   * Obtiene todas las plantillas
   */
  getAllTemplates(): CustomTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Obtiene plantillas activas
   */
  getActiveTemplates(): CustomTemplate[] {
    return this.getAllTemplates().filter(t => t.active);
  }

  /**
   * Obtiene plantillas por categoría
   */
  getTemplatesByCategory(category: CustomTemplate['category']): CustomTemplate[] {
    return this.getAllTemplates().filter(t => t.category === category);
  }

  /**
   * Obtiene plantillas por tags
   */
  getTemplatesByTag(tag: string): CustomTemplate[] {
    return this.getAllTemplates().filter(t => t.tags.includes(tag));
  }

  /**
   * Actualiza una plantilla existente
   */
  updateTemplate(id: string, updates: Partial<Omit<CustomTemplate, 'id' | 'createdAt'>>): CustomTemplate | null {
    const template = this.templates.get(id);
    if (!template) return null;

    const updated: CustomTemplate = {
      ...template,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Si se actualiza el contenido, recalcular variables
    if (updates.content !== undefined) {
      updated.variables = extractVariablesFromText(updates.content);
    }

    this.templates.set(id, updated);
    return updated;
  }

  /**
   * Elimina una plantilla
   */
  deleteTemplate(id: string): boolean {
    return this.templates.delete(id);
  }

  /**
   * Activa/desactiva una plantilla
   */
  toggleTemplate(id: string): CustomTemplate | null {
    const template = this.templates.get(id);
    if (!template) return null;

    template.active = !template.active;
    template.updatedAt = new Date().toISOString();
    
    return template;
  }

  /**
   * Renderiza una plantilla con un contexto
   */
  renderTemplate(
    id: string,
    context: VariableContext,
    options: TemplateRenderOptions = {}
  ): TemplateRenderResult {
    const template = this.getTemplate(id);
    if (!template) {
      return {
        content: '',
        success: false,
        variablesFound: [],
        variablesReplaced: [],
        variablesNotFound: [],
        errors: [`Template not found: ${id}`]
      };
    }

    return this.renderTemplateContent(template.content, context, options);
  }

  /**
   * Renderiza un contenido de plantilla con un contexto
   */
  renderTemplateContent(
    content: string,
    context: VariableContext,
    options: TemplateRenderOptions = {}
  ): TemplateRenderResult {
    const {
      validate = true,
      throwOnError = false,
      showPlaceholders = false
    } = options;

    const errors: string[] = [];
    const variablesFound = extractVariablesFromText(content);
    const variablesReplaced: string[] = [];
    const variablesNotFound: string[] = [];

    // Validar si es necesario
    if (validate) {
      const validationResult = validateTemplate(content, context, {
        checkUnknown: true,
        checkMissing: true,
        checkEmpty: false
      });

      if (!validationResult.valid) {
        errors.push(...validationResult.errors.map(e => e.message));
        
        if (throwOnError) {
          throw new Error(`Template validation failed: ${errors.join(', ')}`);
        }
      }

      // Identificar variables no encontradas
      for (const variable of variablesFound) {
        const hasValue = this.hasVariableInContext(variable, context);
        if (!hasValue) {
          variablesNotFound.push(variable);
        }
      }
    }

    // Reemplazar variables
    try {
      let result = replaceVariables(content, context);

      // Identificar variables reemplazadas (las que ya no aparecen en el resultado)
      for (const variable of variablesFound) {
        const pattern = `{{${variable}}}`;
        if (!result.includes(pattern)) {
          variablesReplaced.push(variable);
        }
      }

      return {
        content: result,
        success: true,
        variablesFound,
        variablesReplaced,
        variablesNotFound,
        errors
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMsg);
      
      return {
        content: '',
        success: false,
        variablesFound,
        variablesReplaced,
        variablesNotFound,
        errors
      };
    }
  }

  /**
   * Valida una plantilla sin renderizar
   */
  validateTemplate(id: string, context?: VariableContext) {
    const template = this.getTemplate(id);
    if (!template) {
      return {
        valid: false,
        errors: [{ variable: id, type: 'UNKNOWN' as const, message: `Template not found: ${id}`, severity: 'error' as const }],
        warnings: [],
        variablesFound: [],
        variablesDefined: [],
        missingRequired: []
      };
    }

    return validateTemplate(template.content, context);
  }

  /**
   * Duplica una plantilla
   */
  duplicateTemplate(id: string, newName: string): CustomTemplate | null {
    const template = this.getTemplate(id);
    if (!template) return null;

    return this.createTemplate(newName, template.content, {
      description: template.description + ' (copia)',
      category: template.category,
      tags: [...template.tags, 'copia'],
      version: '1.0.0',
      active: true
    });
  }

  /**
   * Exporta una plantilla a JSON
   */
  exportTemplate(id: string): string | null {
    const template = this.getTemplate(id);
    if (!template) return null;

    return JSON.stringify(template, null, 2);
  }

  /**
   * Importa una plantilla desde JSON
   */
  importTemplate(jsonString: string): CustomTemplate | null {
    try {
      const data = JSON.parse(jsonString) as Partial<CustomTemplate>;
      
      // Validar datos mínimos
      if (!data.name || !data.content) {
        throw new Error('Invalid template data: missing name or content');
      }

      const template = this.createTemplate(data.name, data.content, {
        description: data.description,
        category: data.category,
        tags: data.tags,
        version: data.version
      });

      return template;
    } catch (error) {
      console.error('Error importing template:', error);
      return null;
    }
  }

  /**
   * Busca plantillas por texto
   */
  searchTemplates(query: string): CustomTemplate[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllTemplates().filter(t =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Verifica si una variable existe en el contexto
   */
  private hasVariableInContext(variableName: string, context: VariableContext): boolean {
    // Verificar variables especiales
    if (variableName === 'char' && context.char) return true;
    if (variableName === 'userMessage' && (context.userMessage || context.mensaje)) return true;
    if (variableName === 'lastSummary' && context.lastSummary) return true;
    if (variableName === 'templateUser' && context.templateUser) return true;

    // Verificar propiedades del contexto
    if (variableName.startsWith('npc.') && context.npc) return true;
    if (variableName.startsWith('jugador.') && context.jugador) return true;
    if (variableName.startsWith('mundo.') && context.world) return true;
    if (variableName.startsWith('pueblo.') && context.pueblo) return true;
    if (variableName.startsWith('edificio.') && context.edificio) return true;

    // Verificar propiedades directas
    if (['npc', 'jugador', 'world', 'pueblo', 'edificio', 'session'].includes(variableName)) {
      return (context as any)[variableName] !== undefined;
    }

    return false;
  }

  /**
   * Genera un ID único para la plantilla
   */
  private generateId(): string {
    return `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Instancia global del manager
export const customTemplateManager = new CustomTemplateManager();
