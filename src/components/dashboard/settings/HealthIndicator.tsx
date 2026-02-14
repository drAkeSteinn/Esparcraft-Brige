'use client';

import { useState, useEffect } from 'react';
import { Database, Brain, Server, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';

interface HealthIndicatorProps {
  variant?: 'full' | 'compact' | 'minimal';
  showLabels?: boolean;
  className?: string;
}

interface ServiceHealth {
  name: string;
  icon: React.ReactNode;
  healthy: boolean;
}

export default function HealthIndicator({ 
  variant = 'compact', 
  showLabels = false,
  className = '' 
}: HealthIndicatorProps) {
  const [services, setServices] = useState<ServiceHealth[]>([
    { name: 'LanceDB', icon: <Database className="h-3 w-3" />, healthy: false },
    { name: 'Ollama', icon: <Brain className="h-3 w-3" />, healthy: false },
    { name: 'LLM', icon: <Server className="h-3 w-3" />, healthy: false },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    setLoading(true);
    
    try {
      // Check embeddings services
      const embeddingsRes = await fetch('/api/embeddings/connections');
      const embeddingsData = await embeddingsRes.json();
      
      // Check LLM
      const llmRes = await fetch('/api/settings/llm-status');
      const llmData = await llmRes.json();
      
      setServices([
        { 
          name: 'LanceDB', 
          icon: <Database className="h-3 w-3" />, 
          healthy: embeddingsData.success && embeddingsData.data?.db 
        },
        { 
          name: 'Ollama', 
          icon: <Brain className="h-3 w-3" />, 
          healthy: embeddingsData.success && embeddingsData.data?.ollama 
        },
        { 
          name: 'LLM', 
          icon: <Server className="h-3 w-3" />, 
          healthy: llmData.success && llmData.data?.connected 
        },
      ]);
    } catch (error) {
      console.error('Error checking health:', error);
    } finally {
      setLoading(false);
    }
  };

  const healthyCount = services.filter(s => s.healthy).length;
  const allHealthy = healthyCount === services.length;

  if (variant === 'minimal') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div 
              className={`flex items-center gap-1 ${className}`}
              animate={{ scale: allHealthy ? 1 : [1, 1.05, 1] }}
              transition={{ duration: 0.5, repeat: allHealthy ? 0 : Infinity, repeatDelay: 2 }}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : allHealthy ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              )}
            </motion.div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              {allHealthy ? 'Sistema operativo' : `${healthyCount}/${services.length} servicios activos`}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <div className={`flex items-center gap-2 ${className}`}>
          {services.map((service, index) => (
            <Tooltip key={service.name}>
              <TooltipTrigger asChild>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center gap-1 p-1.5 rounded-md ${
                    service.healthy 
                      ? 'bg-green-100 dark:bg-green-900' 
                      : 'bg-red-100 dark:bg-red-900'
                  }`}
                >
                  <span className={service.healthy ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                    {service.icon}
                  </span>
                  {showLabels && (
                    <span className="text-xs">{service.name}</span>
                  )}
                </motion.div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {service.name}: {service.healthy ? 'Conectado' : 'Desconectado'}
                </p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    );
  }

  // Full variant
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-2">
        {services.map((service, index) => (
          <motion.div
            key={service.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-2"
          >
            <Badge 
              variant={service.healthy ? 'default' : 'destructive'}
              className="gap-1"
            >
              {service.icon}
              <span className="text-xs">{service.name}</span>
              {service.healthy ? (
                <CheckCircle className="h-3 w-3" />
              ) : (
                <AlertCircle className="h-3 w-3" />
              )}
            </Badge>
          </motion.div>
        ))}
      </div>
      
      <Badge 
        variant="outline" 
        className={allHealthy ? 'border-green-500 text-green-600' : 'border-yellow-500 text-yellow-600'}
      >
        {healthyCount}/{services.length}
      </Badge>
    </div>
  );
}
