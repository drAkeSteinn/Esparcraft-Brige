import { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Check, AlertCircle, ExternalLink, Download, Copy, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Guía de Instalación - Sistema de Embeddings',
  description: 'Guía paso a paso para instalar PostgreSQL, pgvector y configurar el sistema de embeddings'
};

export default function InstallationGuidePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">🚀 Guía de Instalación</h1>
          <p className="text-muted-foreground text-lg">
            Sistema de Embeddings para Bridge IA
          </p>
        </div>

        {/* Status Card */}
        <Card className="mb-8 border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-primary" />
              Estado del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-500/10 text-green-700">
                  <Check className="h-3 w-3 mr-1" />
                  Sistema JSON
                </Badge>
                <span className="text-sm text-muted-foreground">Funcionando</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  PostgreSQL
                </Badge>
                <span className="text-sm text-muted-foreground">Pendiente</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Text Gen WebUI
                </Badge>
                <span className="text-sm text-muted-foreground">Pendiente</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs defaultValue="postgres" className="space-y-6">
          {/* Tab 1: PostgreSQL */}
          <TabsContent value="postgres" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  1. Instalar PostgreSQL
                </CardTitle>
                <CardDescription>
                  Base de datos necesaria para almacenar embeddings vectoriales
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Windows */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Badge>Windows</Badge>
                  </h3>
                  <ol className="space-y-2 text-sm">
                    <li className="flex gap-2">
                      <span className="font-mono bg-primary/10 px-2 py-1 rounded">1.</span>
                      <span>Descargar el instalador desde <a href="https://www.postgresql.org/download/windows/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1"><ExternalLink className="h-3 w-3" /> postgresql.org</a></span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-mono bg-primary/10 px-2 py-1 rounded">2.</span>
                      <span>Ejecutar el instalador (versión recomendada: PostgreSQL 15 o 16)</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-mono bg-primary/10 px-2 py-1 rounded">3.</span>
                      <span>Configurar un password para el usuario <code className="bg-secondary px-1 rounded">postgres</code></span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-mono bg-primary/10 px-2 py-1 rounded">4.</span>
                      <span>Asegurarse de marcar la opción "Add to PATH" durante la instalación</span>
                    </li>
                  </ol>
                </div>

                {/* macOS */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Badge>macOS</Badge>
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="font-medium mb-2">Opción A: Usar Homebrew (Recomendado)</p>
                      <div className="bg-secondary/50 p-3 rounded-lg space-y-1 font-mono text-xs">
                        <div>$ brew install postgresql@16</div>
                        <div>$ brew services start postgresql@16</div>
                      </div>
                    </div>
                    <div>
                      <p className="font-medium mb-2">Opción B: Usar Postgres.app</p>
                      <div className="flex items-center gap-2 text-sm">
                        <a href="https://postgresapp.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                          Descargar Postgres.app <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Linux */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Badge>Linux</Badge>
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="font-medium mb-2">Ubuntu/Debian</p>
                      <div className="bg-secondary/50 p-3 rounded-lg space-y-1 font-mono text-xs">
                        <div>$ sudo apt update</div>
                        <div>$ sudo apt install postgresql-16 postgresql-contrib-16</div>
                        <div>$ sudo systemctl start postgresql</div>
                      </div>
                    </div>
                    <div>
                      <p className="font-medium mb-2">Fedora/RHEL</p>
                      <div className="bg-secondary/50 p-3 rounded-lg space-y-1 font-mono text-xs">
                        <div>$ sudo dnf install postgresql-server postgresql-contrib</div>
                        <div>$ sudo postgresql-setup --initdb</div>
                        <div>$ sudo systemctl start postgresql</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Verification */}
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-lg">✅ Verificar Instalación</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-secondary/50 p-3 rounded-lg font-mono text-xs">
                      <div>$ postgres --version</div>
                      <div className="mt-2 text-muted-foreground"># Debería mostrar: postgres (PostgreSQL) 16.x.x</div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: pgvector */}
          <TabsContent value="pgvector" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  2. Instalar Extensión pgvector
                </CardTitle>
                <CardDescription>
                  Extensión necesaria para búsqueda vectorial eficiente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Windows */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Badge>Windows</Badge>
                  </h3>
                  <ol className="space-y-2 text-sm">
                    <li className="flex gap-2">
                      <span className="font-mono bg-primary/10 px-2 py-1 rounded">1.</span>
                      <span>Instalar Git si no lo tienes: <a href="https://git-scm.com/download/win" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1"><ExternalLink className="h-3 w-3" /> git-scm.com</a></span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-mono bg-primary/10 px-2 py-1 rounded">2.</span>
                      <span>Abrir "Command Prompt" o "PowerShell" como Administrador</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-mono bg-primary/10 px-2 py-1 rounded">3.</span>
                      <span>Navegar al directorio donde instalar pgvector</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-mono bg-primary/10 px-2 py-1 rounded">4.</span>
                      <span>Clonar y compilar pgvector:</span>
                    </li>
                  </ol>
                  <div className="bg-secondary/50 p-4 rounded-lg mt-4">
                    <div className="font-mono text-xs space-y-1">
                      <div>git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git</div>
                      <div>cd pgvector</div>
                      <div>git checkout v0.5.1</div>
                      <div>cmake -G "MinGW Makefiles" -DCMAKE_BUILD_TYPE=Release ..</div>
                      <div>cmake --build . --config Release</div>
                      <div>cmake --install . --config Release</div>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Nota: Para Windows, puedes usar <a href="https://github.com/tensorchord/pgvector-windows" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1"><ExternalLink className="h-3 w-3" /> pgvector-windows</a> para una versión precompilada.
                    </p>
                  </div>
                </div>

                {/* macOS */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Badge>macOS</Badge>
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="font-medium mb-2">Usar Homebrew</p>
                      <div className="bg-secondary/50 p-3 rounded-lg space-y-1 font-mono text-xs">
                        <div>$ brew install pgvector</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Linux */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Badge>Linux</Badge>
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="font-medium mb-2">Ubuntu/Debian</p>
                      <div className="bg-secondary/50 p-3 rounded-lg space-y-1 font-mono text-xs">
                        <div>$ git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git</div>
                        <div>$ cd pgvector</div>
                        <div>$ make</div>
                        <div>$ sudo make install</div>
                        <div>$ sudo ldconfig</div>
                      </div>
                    </div>
                    <div>
                      <p className="font-medium mb-2">Fedora/RHEL</p>
                      <div className="bg-secondary/50 p-3 rounded-lg space-y-1 font-mono text-xs">
                        <div>$ sudo dnf install pgvector</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enable extension */}
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-lg">⚡ Habilitar Extensión</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-3">Ejecuta este comando SQL en PostgreSQL para habilitar pgvector:</p>
                    <div className="bg-secondary p-3 rounded-lg">
                      <code className="font-mono text-sm">CREATE EXTENSION IF NOT EXISTS vector;</code>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Text Generation WebUI */}
          <TabsContent value="textgen" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  3. Instalar Text Generation WebUI
                </CardTitle>
                <CardDescription>
                  Servidor necesario para generar embeddings vectoriales
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3">Requisitos</h3>
                  <ul className="space-y-2 text-sm list-disc list-inside">
                    <li>Python 3.10 o superior</li>
                    <li>Git</li>
                    <li>10 GB de espacio libre en disco</li>
                    <li>GPU con 8GB+ de VRAM (opcional pero recomendado)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Instalación</h3>
                  <ol className="space-y-2 text-sm">
                    <li className="flex gap-2">
                      <span className="font-mono bg-primary/10 px-2 py-1 rounded">1.</span>
                      <span>Clonar el repositorio:</span>
                    </li>
                  </ol>
                  <div className="bg-secondary/50 p-3 rounded-lg font-mono text-xs mb-4">
                    <div>git clone https://github.com/oobabooga/text-generation-webui</div>
                    <div>cd text-generation-webui</div>
                  </div>
                  <ol start={2} className="space-y-2 text-sm">
                    <li className="flex gap-2">
                      <span className="font-mono bg-primary/10 px-2 py-1 rounded">2.</span>
                      <span>Instalar dependencias:</span>
                    </li>
                  </ol>
                  <div className="bg-secondary/50 p-3 rounded-lg font-mono text-xs mb-4">
                    <div>pip install -r requirements.txt</div>
                  </div>
                  <ol start={3} className="space-y-2 text-sm">
                    <li className="flex gap-2">
                      <span className="font-mono bg-primary/10 px-2 py-1 rounded">3.</span>
                      <span>Iniciar el servidor:</span>
                    </li>
                  </ol>
                  <div className="bg-secondary/50 p-3 rounded-lg font-mono text-xs mb-4">
                    <div>python server.py --listen --listen-port 5000</div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Configurar Modelo de Embeddings</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    En la interfaz web (usualmente en http://localhost:7860), ve a la pestaña "Models" y descarga un modelo de embeddings compatible.
                  </p>
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="pt-4">
                      <p className="text-sm font-medium mb-2">Modelos Recomendados:</p>
                      <ul className="space-y-1 text-sm">
                        <li className="flex items-center gap-2">
                          <Badge variant="secondary">all-MiniLM-L6-v2</Badge>
                          <span className="text-muted-foreground">Rápido, 384 dimensiones</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Badge variant="secondary">all-MiniLM-L12-v2</Badge>
                          <span className="text-muted-foreground">Equilibrado, 384 dimensiones</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Badge variant="secondary">sentence-transformers/all-mpnet-base-v2</Badge>
                          <span className="text-muted-foreground">Alta calidad, 768 dimensiones</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Configuración */}
          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Copy className="h-5 w-5" />
                  4. Configurar Variables de Entorno
                </CardTitle>
                <CardDescription>
                  Agrega estas variables al archivo <code className="bg-secondary px-1 rounded">.env</code>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-semibold mb-2 text-sm">Variables de PostgreSQL</p>
                  <div className="bg-secondary/50 p-4 rounded-lg space-y-2">
                    <div className="font-mono text-xs">
                      <span className="text-muted-foreground"># PostgreSQL para Embeddings</span><br />
                      EMBEDDINGS_DB_HOST=localhost<br />
                      EMBEDDINGS_DB_PORT=5432<br />
                      EMBEDDINGS_DB_NAME=bridge_embeddings<br />
                      EMBEDDINGS_DB_USER=postgres<br />
                      EMBEDDINGS_DB_PASSWORD=tu_password_aqui
                    </div>
                  </div>
                </div>

                <div>
                  <p className="font-semibold mb-2 text-sm">Variables de Text Generation WebUI</p>
                  <div className="bg-secondary/50 p-4 rounded-lg space-y-2">
                    <div className="font-mono text-xs">
                      <span className="text-muted-foreground"># Text Generation WebUI</span><br />
                      TEXT_GEN_WEBUI_URL=http://localhost:5000<br />
                      EMBEDDING_MODEL=all-MiniLM-L6-v2<br />
                      EMBEDDING_DIMENSION=384<br />
                      EMBEDDING_BATCH_SIZE=10
                    </div>
                  </div>
                </div>

                <div>
                  <p className="font-semibold mb-2 text-sm">Variables de Búsqueda</p>
                  <div className="bg-secondary/50 p-4 rounded-lg space-y-2">
                    <div className="font-mono text-xs">
                      <span className="text-muted-foreground"># Configuración de búsqueda</span><br />
                      DEFAULT_SIMILARITY_THRESHOLD=0.7<br />
                      MAX_SEARCH_RESULTS=10<br />
                      MAX_CONTEXT_TOKENS=4000
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Initialize Database */}
            <Card className="bg-green-500/5 border-green-500/20">
              <CardHeader>
                <CardTitle className="text-lg text-green-700">🚀 Inicializar Base de Datos</CardTitle>
                <CardDescription>
                  Ejecuta este comando para crear las tablas de embeddings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-secondary/50 p-4 rounded-lg font-mono text-xs">
                  <div>node scripts/init-postgres-db.js</div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Esto creará la base de datos <code className="bg-secondary px-1 rounded">bridge_embeddings</code> con todas las tablas necesarias.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Troubleshooting */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Solución de Problemas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">Error: "ECONNREFUSED"</h4>
                <p className="text-muted-foreground">PostgreSQL no está corriendo. Inícialo con el comando apropiado para tu sistema operativo.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Error: "password authentication failed"</h4>
                <p className="text-muted-foreground">Verifica que el password en <code className="bg-secondary px-1 rounded">.env</code> coincida con el que configuraste durante la instalación de PostgreSQL.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Error: "could not open extension control file"</h4>
                <p className="text-muted-foreground">pgvector no está instalado correctamente. Revisa la sección de instalación de pgvector arriba.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Error: "connection refused" al conectar a Text Generation WebUI</h4>
                <p className="text-muted-foreground">Asegúrate de que el servidor de Text Generation WebUI esté corriendo en el puerto correcto (por defecto: 5000 o 7860).</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="mt-6 bg-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">✅ Siguientes Pasos</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm list-decimal list-inside">
              <li>Instalar PostgreSQL siguiendo la guía de la pestaña 1</li>
              <li>Instalar pgvector siguiendo la guía de la pestaña 2</li>
              <li>Instalar Text Generation WebUI siguiendo la guía de la pestaña 3</li>
              <li>Configurar las variables de entorno en tu archivo <code className="bg-secondary px-1 rounded">.env</code></li>
              <li>Ejecutar <code className="bg-secondary px-1 rounded">node scripts/init-postgres-db.js</code></li>
              <li>Verificar que todo esté funcionando en la pestaña de Embeddings del Dashboard</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
