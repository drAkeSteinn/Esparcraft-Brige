-- Schema PostgreSQL para Sistema de Embeddings
-- Requiere extensión pgvector instalada

-- Crear extensión pgvector si no existe
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabla para documentos con embeddings
CREATE TABLE IF NOT EXISTS embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  vector vector(1536), -- Dimension predeterminada (ajustar según modelo)
  metadata JSONB DEFAULT '{}',
  namespace VARCHAR(255) DEFAULT 'default',
  source_type VARCHAR(100), -- 'world', 'npc', 'session', 'custom', etc.
  source_id VARCHAR(255), -- ID del recurso original (world_id, npc_id, etc.)
  model_name VARCHAR(255) DEFAULT 'text-embedding-ada-002',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para Record Manager (similar a Flowise)
CREATE TABLE IF NOT EXISTS record_namespaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de relación entre embeddings y namespaces
CREATE TABLE IF NOT EXISTS record_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  namespace_id UUID NOT NULL REFERENCES record_namespaces(id) ON DELETE CASCADE,
  embedding_id UUID NOT NULL REFERENCES embeddings(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(namespace_id, embedding_id)
);

-- Tabla para estadísticas de embeddings
CREATE TABLE IF NOT EXISTS embedding_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE DEFAULT CURRENT_DATE,
  namespace VARCHAR(255),
  total_embeddings INTEGER DEFAULT 0,
  total_searches INTEGER DEFAULT 0,
  avg_search_time_ms FLOAT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsqueda vectorial (HNSW - Hierarchical Navigable Small World)
-- Este es el índice más eficiente para búsqueda de similitud
CREATE INDEX IF NOT EXISTS embeddings_vector_idx ON embeddings
  USING hnsw (vector vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Índices para búsquedas por metadata y namespace
CREATE INDEX IF NOT EXISTS embeddings_namespace_idx ON embeddings(namespace);
CREATE INDEX IF NOT EXISTS embeddings_source_type_idx ON embeddings(source_type);
CREATE INDEX IF NOT EXISTS embeddings_source_id_idx ON embeddings(source_id);
CREATE INDEX IF NOT EXISTS embeddings_model_name_idx ON embeddings(model_name);
CREATE INDEX IF NOT EXISTS embeddings_metadata_idx ON embeddings USING GIN (metadata);

-- Índices para Record Manager
CREATE INDEX IF NOT EXISTS record_embeddings_namespace_idx ON record_embeddings(namespace_id);
CREATE INDEX IF NOT EXISTS record_embeddings_embedding_idx ON record_embeddings(embedding_id);

-- Índices para estadísticas
CREATE INDEX IF NOT EXISTS embedding_stats_date_idx ON embedding_stats(date);
CREATE INDEX IF NOT EXISTS embedding_stats_namespace_idx ON embedding_stats(namespace);

-- Triggers para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_embeddings_updated_at
  BEFORE UPDATE ON embeddings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_record_namespaces_updated_at
  BEFORE UPDATE ON record_namespaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para calcular similitud coseno entre dos vectores
CREATE OR REPLACE FUNCTION cosine_similarity(a vector, b vector)
RETURNS FLOAT AS $$
  SELECT (a <#> b) * -1;
$$ LANGUAGE SQL IMMUTABLE STRICT;

-- Función para buscar embeddings similares
CREATE OR REPLACE FUNCTION search_similar_embeddings(
  query_vector vector(1536),
  search_namespace VARCHAR DEFAULT NULL,
  limit_count INTEGER DEFAULT 10,
  similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  namespace VARCHAR,
  source_type VARCHAR,
  source_id VARCHAR,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.content,
    e.metadata,
    e.namespace,
    e.source_type,
    e.source_id,
    (1 - (e.vector <#> query_vector)) AS similarity
  FROM embeddings e
  WHERE
    (search_namespace IS NULL OR e.namespace = search_namespace)
    AND (1 - (e.vector <#> query_vector)) >= similarity_threshold
  ORDER BY e.vector <#> query_vector
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Función para insertar embedding
CREATE OR REPLACE FUNCTION insert_embedding(
  p_content TEXT,
  p_vector vector(1536),
  p_metadata JSONB DEFAULT '{}',
  p_namespace VARCHAR DEFAULT 'default',
  p_source_type VARCHAR DEFAULT NULL,
  p_source_id VARCHAR DEFAULT NULL,
  p_model_name VARCHAR DEFAULT 'text-embedding-ada-002'
)
RETURNS UUID AS $$
DECLARE
  new_embedding_id UUID;
BEGIN
  INSERT INTO embeddings (
    content,
    vector,
    metadata,
    namespace,
    source_type,
    source_id,
    model_name
  )
  VALUES (
    p_content,
    p_vector,
    p_metadata,
    p_namespace,
    p_source_type,
    p_source_id,
    p_model_name
  )
  RETURNING id INTO new_embedding_id;

  RETURN new_embedding_id;
END;
$$ LANGUAGE plpgsql;

-- Función para eliminar embeddings por source
CREATE OR REPLACE FUNCTION delete_embeddings_by_source(
  p_source_type VARCHAR,
  p_source_id VARCHAR
)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM embeddings
  WHERE source_type = p_source_type
    AND source_id = p_source_id;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Función para agregar embedding a namespace del Record Manager
CREATE OR REPLACE FUNCTION add_embedding_to_namespace(
  p_namespace VARCHAR,
  p_embedding_id UUID
)
RETURNS UUID AS $$
DECLARE
  namespace_id UUID;
  record_id UUID;
BEGIN
  -- Obtener o crear namespace
  SELECT id INTO namespace_id
  FROM record_namespaces
  WHERE namespace = p_namespace
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO record_namespaces (namespace, description)
    VALUES (p_namespace, 'Auto-created namespace')
    RETURNING id INTO namespace_id;
  END IF;

  -- Crear relación
  INSERT INTO record_embeddings (namespace_id, embedding_id)
  VALUES (namespace_id, p_embedding_id)
  ON CONFLICT (namespace_id, embedding_id) DO NOTHING
  RETURNING id INTO record_id;

  RETURN record_id;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener embeddings de un namespace
CREATE OR REPLACE FUNCTION get_namespace_embeddings(
  p_namespace VARCHAR,
  limit_count INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  source_type VARCHAR,
  source_id VARCHAR,
  added_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.content,
    e.metadata,
    e.source_type,
    e.source_id,
    re.added_at
  FROM record_embeddings re
  JOIN embeddings e ON e.id = re.embedding_id
  JOIN record_namespaces rn ON rn.id = re.namespace_id
  WHERE rn.namespace = p_namespace
  ORDER BY re.added_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Comentarios para documentación
COMMENT ON TABLE embeddings IS 'Almacena documentos con sus embeddings vectoriales para búsqueda de similitud';
COMMENT ON COLUMN embeddings.content IS 'Contenido del documento en texto plano';
COMMENT ON COLUMN embeddings.vector IS 'Vector de embedding generado por el modelo (usando pgvector)';
COMMENT ON COLUMN embeddings.metadata IS 'Metadata adicional en formato JSONB';
COMMENT ON COLUMN embeddings.namespace IS 'Namespace para organizar embeddings';
COMMENT ON COLUMN embeddings.source_type IS 'Tipo de fuente original (world, npc, session, custom)';
COMMENT ON COLUMN embeddings.source_id IS 'ID del recurso original en el sistema JSON';
COMMENT ON COLUMN embeddings.model_name IS 'Nombre del modelo de embeddings utilizado';

COMMENT ON TABLE record_namespaces IS 'Gestiona namespaces para el Record Manager (similar a Flowise)';
COMMENT ON TABLE record_embeddings IS 'Relación entre namespaces y embeddings (many-to-many)';

COMMENT ON FUNCTION search_similar_embeddings IS 'Busca embeddings similares usando distancia coseno';
COMMENT ON FUNCTION insert_embedding IS 'Inserta un nuevo embedding en la base de datos';
COMMENT ON FUNCTION delete_embeddings_by_source IS 'Elimina todos los embeddings de una fuente específica';
COMMENT ON FUNCTION add_embedding_to_namespace IS 'Agrega un embedding a un namespace del Record Manager';
COMMENT ON FUNCTION get_namespace_embeddings IS 'Obtiene todos los embeddings de un namespace específico';

-- Vista para consultar embeddings fácilmente
CREATE OR REPLACE VIEW embeddings_view AS
SELECT
  e.id,
  e.content,
  e.metadata,
  e.namespace,
  e.source_type,
  e.source_id,
  e.model_name,
  e.created_at,
  e.updated_at,
  COUNT(re.id) AS namespace_count
FROM embeddings e
LEFT JOIN record_embeddings re ON re.embedding_id = e.id
GROUP BY e.id, e.content, e.metadata, e.namespace, e.source_type, e.source_id, e.model_name, e.created_at, e.updated_at;

COMMENT ON VIEW embeddings_view IS 'Vista conveniente para consultar embeddings con conteo de namespaces';
