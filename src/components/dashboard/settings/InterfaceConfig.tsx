'use client';

import { useState, useEffect } from 'react';
import { Save, Palette, Languages, Type, Zap, Layout, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

const STORAGE_KEY = 'bridge_interface_config';

interface InterfaceConfig {
  theme: 'light' | 'dark' | 'system';
  language: string;
  fontSize: 'small' | 'medium' | 'large';
  animations: boolean;
  density: 'compact' | 'normal';
}

const DEFAULT_CONFIG: InterfaceConfig = {
  theme: 'system',
  language: 'es',
  fontSize: 'medium',
  animations: true,
  density: 'normal',
};

interface InterfaceConfigProps {
  onConfigSaved?: () => void;
}

const LANGUAGES = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'it', label: 'Italiano' },
  { value: 'pt', label: 'Português' },
];

const FONT_SIZE_LABELS: Record<string, string> = {
  small: 'Pequeño (14px)',
  medium: 'Mediano (16px)',
  large: 'Grande (18px)',
};

const DENSITY_LABELS: Record<string, string> = {
  compact: 'Compacta (más contenido visible)',
  normal: 'Normal (espaciado estándar)',
};

export default function InterfaceConfig({ onConfigSaved }: InterfaceConfigProps) {
  const [config, setConfig] = useState<InterfaceConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  // Cargar configuración desde localStorage
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem(STORAGE_KEY);
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        setConfig({ ...DEFAULT_CONFIG, ...parsed });
      }
    } catch (err) {
      console.error('Error cargando configuración de interfaz:', err);
      setError('Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      // Guardar en localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));

      // Aplicar configuración al DOM
      applyConfigToDOM(config);

      // Aplicar configuración al servidor
      const response = await fetch('/api/settings/interface', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error('Error al aplicar configuración en el servidor');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);

      if (onConfigSaved) {
        onConfigSaved();
      }
    } catch (err) {
      console.error('Error guardando configuración:', err);
      setError(err instanceof Error ? err.message : 'Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('¿Estás seguro de que deseas restablecer la configuración por defecto?')) {
      setConfig(DEFAULT_CONFIG);
    }
  };

  const applyConfigToDOM = (cfg: InterfaceConfig) => {
    // Aplicar tamaño de fuente
    document.documentElement.style.setProperty('--font-size-multiplier',
      cfg.fontSize === 'small' ? '0.875' : cfg.fontSize === 'large' ? '1.125' : '1'
    );

    // Aplicar densidad
    if (cfg.density === 'compact') {
      document.documentElement.style.setProperty('--density-multiplier', '0.8');
    } else {
      document.documentElement.style.removeProperty('--density-multiplier');
    }

    // Aplicar tema (si usas next-themes, esto debería manejarse con el ThemeProvider)
    document.documentElement.setAttribute('data-theme', cfg.theme);
  };

  const handlePreview = () => {
    applyConfigToDOM(config);
    setPreviewMode(true);
    setTimeout(() => setPreviewMode(false), 3000);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Configuración de la Interfaz</CardTitle>
          <CardDescription>Cargando...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          <CardTitle>Configuración de la Interfaz</CardTitle>
        </div>
        <CardDescription>
          Personaliza la apariencia y comportamiento de la aplicación
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mensaje de éxito */}
        {saved && (
          <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
            <Info className="h-4 w-4 text-green-600 dark:text-green-500" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              Configuración guardada correctamente
            </AlertDescription>
          </Alert>
        )}

        {/* Mensaje de error */}
        {error && (
          <Alert variant="destructive">
            <Info className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Tema */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <Label className="text-base font-medium">Tema</Label>
          </div>
          <RadioGroup
            value={config.theme}
            onValueChange={(value) =>
              setConfig({ ...config, theme: value as 'light' | 'dark' | 'system' })
            }
          >
            <div className="flex flex-col space-y-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="light" id="theme-light" />
                <Label htmlFor="theme-light" className="cursor-pointer">
                  Claro
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dark" id="theme-dark" />
                <Label htmlFor="theme-dark" className="cursor-pointer">
                  Oscuro
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="system" id="theme-system" />
                <Label htmlFor="theme-system" className="cursor-pointer">
                  Automático (seguir sistema)
                </Label>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Idioma */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Languages className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="language">Idioma</Label>
          </div>
          <Select
            value={config.language}
            onValueChange={(value) => setConfig({ ...config, language: value })}
          >
            <SelectTrigger id="language" className="max-w-xs">
              <SelectValue placeholder="Seleccionar idioma" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Idioma de la interfaz de usuario
          </p>
        </div>

        {/* Tamaño de fuente */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Type className="h-4 w-4 text-muted-foreground" />
            <Label className="text-base font-medium">Tamaño de Fuente</Label>
          </div>
          <RadioGroup
            value={config.fontSize}
            onValueChange={(value) =>
              setConfig({ ...config, fontSize: value as 'small' | 'medium' | 'large' })
            }
          >
            <div className="flex flex-col space-y-2">
              {Object.entries(FONT_SIZE_LABELS).map(([value, label]) => (
                <div key={value} className="flex items-center space-x-2">
                  <RadioGroupItem value={value} id={`font-${value}`} />
                  <Label htmlFor={`font-${value}`} className="cursor-pointer">
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>

        {/* Animaciones */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <div className="space-y-0.5">
              <Label className="text-base">Animaciones</Label>
              <p className="text-sm text-muted-foreground">
                Habilitar transiciones y animaciones de la interfaz
              </p>
            </div>
          </div>
          <Switch
            checked={config.animations}
            onCheckedChange={(checked) => setConfig({ ...config, animations: checked })}
          />
        </div>

        {/* Densidad */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Layout className="h-4 w-4 text-muted-foreground" />
            <Label className="text-base font-medium">Densidad de Elementos</Label>
          </div>
          <RadioGroup
            value={config.density}
            onValueChange={(value) =>
              setConfig({ ...config, density: value as 'compact' | 'normal' })
            }
          >
            <div className="flex flex-col space-y-2">
              {Object.entries(DENSITY_LABELS).map(([value, label]) => (
                <div key={value} className="flex items-center space-x-2">
                  <RadioGroupItem value={value} id={`density-${value}`} />
                  <Label htmlFor={`density-${value}`} className="cursor-pointer">
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
          <p className="text-xs text-muted-foreground">
            Afecta el espaciado entre elementos en la interfaz
          </p>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-3 pt-4 border-t">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin">⟳</span>
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Configuración
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handlePreview}
            disabled={saving || previewMode}
          >
            {previewMode ? '👁️ Vista Previa Activa' : '👁️ Vista Previa'}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={saving}
          >
            Restablecer por Defecto
          </Button>
        </div>

        {/* Información adicional */}
        <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-500" />
          <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
            <strong>Nota:</strong> Algunos cambios, como el tema y el idioma, pueden requerir recargar la página
            para aplicarse completamente en todas las secciones de la aplicación.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
