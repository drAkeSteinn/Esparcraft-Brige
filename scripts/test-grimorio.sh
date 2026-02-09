#!/bin/bash

# SCRIPT DE TESTING MANUAL DEL GRIMORIO
# Ejecuta tests de variables primarias, plantillas y casos extremos

echo "=========================================="
echo "TESTING MANUAL DEL GRIMORIO"
echo "=========================================="
echo ""

BASE_URL="http://localhost:3000"
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Función para ejecutar un test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected="$3"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo "🧪 Test $TOTAL_TESTS: $test_name"
    echo "   Comando: $test_command"

    # Ejecutar el comando
    response=$(eval "$test_command" 2>/dev/null)

    # Verificar si el test pasó
    if echo "$response" | grep -q "$expected"; then
        echo "   ✅ PASSED"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo "   ❌ FAILED"
        echo "   Esperado: $expected"
        echo "   Recibido: $response"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo ""
}

# Función para ejecutar un test de API
api_test() {
    local test_name="$1"
    local endpoint="$2"
    local data="$3"
    local expected="$4"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo "🧪 Test $TOTAL_TESTS: $test_name"
    echo "   Endpoint: $endpoint"

    # Ejecutar el comando curl
    response=$(curl -s -X POST "$BASE_URL$endpoint" \
        -H "Content-Type: application/json" \
        -d "$data" \
        2>/dev/null)

    # Verificar si el test pasó
    if echo "$response" | grep -q "$expected"; then
        echo "   ✅ PASSED"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo "   ❌ FAILED"
        echo "   Esperado contener: $expected"
        echo "   Recibido: $response"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo ""
}

echo "=========================================="
echo "GRUPO 1: TESTS DE API BÁSICA"
echo "=========================================="
echo ""

# Test 1: Listar todas las cards
run_test "Listar todas las cards" \
    "curl -s '$BASE_URL/api/grimorio' | grep -q 'success'" \
    "success"

# Test 2: Listar variables primarias
run_test "Listar variables primarias" \
    "curl -s '$BASE_URL/api/grimorio?tipo=variable' | grep -q 'success'" \
    "success"

# Test 3: Listar plantillas
run_test "Listar plantillas" \
    "curl -s '$BASE_URL/api/grimorio?tipo=plantilla' | grep -q 'success'" \
    "success"

# Test 4: Listar por categoría
run_test "Listar por categoría" \
    "curl -s '$BASE_URL/api/grimorio?categoria=variables' | grep -q 'success'" \
    "success"

echo "=========================================="
echo "GRUPO 2: TESTS DE ESTADÍSTICAS"
echo "=========================================="
echo ""

# Test 5: Obtener estadísticas del Grimorio
run_test "Obtener estadísticas del Grimorio" \
    "curl -s '$BASE_URL/api/grimorio/stats' | grep -q 'success'" \
    "success"

# Test 6: Obtener estadísticas del cache
run_test "Obtener estadísticas del cache" \
    "curl -s '$BASE_URL/api/grimorio/cache' | grep -q 'success'" \
    "success"

# Test 7: Obtener reporte detallado
run_test "Obtener reporte detallado" \
    "curl -s '$BASE_URL/api/grimorio/stats?action=report' | grep -q 'success'" \
    "success"

# Test 8: Obtener variables más usadas
run_test "Obtener variables más usadas" \
    "curl -s '$BASE_URL/api/grimorio/stats?action=top-variables&limit=5' | grep -q 'success'" \
    "success"

echo "=========================================="
echo "GRUPO 3: TESTS DE APLICACIÓN"
echo "=========================================="
echo ""

# Necesitamos un ID de plantilla para estos tests
echo "📝 Obteniendo ID de una plantilla de prueba..."
PLANTILLA_ID=$(curl -s "$BASE_URL/api/grimorio?tipo=plantilla" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$PLANTILLA_ID" ]; then
    echo "⚠️  No se encontró ninguna plantilla para tests de aplicación"
    echo "   Creando una plantilla de prueba..."

    # Crear plantilla de prueba
    CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/grimorio" \
        -H "Content-Type: application/json" \
        -d '{
            "key": "test_template",
            "nombre": "Template de Test",
            "plantilla": "Hola {{jugador.nombre}}, tu nivel es {{jugador.nivel}}",
            "categoria": "general",
            "tipo": "plantilla",
            "descripcion": "Template para testing"
        }')

    if echo "$CREATE_RESPONSE" | grep -q '"success":true'; then
        PLANTILLA_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        echo "   ✅ Plantilla creada con ID: $PLANTILLA_ID"
    else
        echo "   ❌ Error al crear plantilla de prueba"
        PLANTILLA_ID="none"
    fi
    echo ""
fi

if [ "$PLANTILLA_ID" != "none" ]; then
    # Test 9: Aplicar plantilla con contexto válido
    api_test "Aplicar plantilla con contexto válido" \
        "/api/grimorio/apply/$PLANTILLA_ID" \
        '{
            "context": {
                "jugador": {
                    "nombre": "TestUser",
                    "nivel": "10",
                    "raza": "Humano"
                }
            },
            "useCache": false
        }' \
        '"success":true'

    # Test 10: Aplicar plantilla sin cache
    api_test "Aplicar plantilla sin cache" \
        "/api/grimorio/apply/$PLANTILLA_ID" \
        '{
            "context": {
                "jugador": {
                    "nombre": "TestUser2",
                    "nivel": "5"
                }
            },
            "useCache": false
        }' \
        '"fromCache":false'

    # Test 11: Aplicar plantilla con cache (segunda llamada)
    api_test "Aplicar plantilla con cache (segunda llamada)" \
        "/api/grimorio/apply/$PLANTILLA_ID" \
        '{
            "context": {
                "jugador": {
                    "nombre": "TestUser3",
                    "nivel": "15"
                }
            },
            "useCache": true
        }' \
        '"fromCache":true'

    # Test 12: Aplicar plantilla con contexto vacío
    api_test "Aplicar plantilla con contexto vacío" \
        "/api/grimorio/apply/$PLANTILLA_ID" \
        '{
            "context": {},
            "useCache": false
        }' \
        '"success":true'

    # Test 13: Aplicar plantilla inexistente
    run_test "Aplicar plantilla inexistente" \
        "curl -s -X POST '$BASE_URL/api/grimorio/apply/nonexistent-id' \
            -H 'Content-Type: application/json' \
            -d '{\"context\": {}}' | grep -q 'Card no encontrada'" \
        "Card no encontrada"
fi

echo "=========================================="
echo "GRUPO 4: TESTS DE CACHE"
echo "=========================================="
echo ""

# Test 14: Limpiar cache
run_test "Limpiar todo el cache" \
    "curl -s -X DELETE '$BASE_URL/api/grimorio/cache' | grep -q 'success'" \
    "success"

# Test 15: Limpiar cache expirado
run_test "Limpiar cache expirado" \
    "curl -s '$BASE_URL/api/grimorio/cache?action=clean' | grep -q 'success'" \
    "success"

# Test 16: Obtener estadísticas de cache después de limpiar
run_test "Obtener estadísticas de cache (post-limpieza)" \
    "curl -s '$BASE_URL/api/grimorio/cache?action=stats' | grep -q '\"entries\":0'" \
    '"entries":0'

echo "=========================================="
echo "GRUPO 5: TESTS DE ESTADÍSTICAS"
echo "=========================================="
echo ""

# Test 17: Reiniciar estadísticas
run_test "Reiniciar estadísticas del Grimorio" \
    "curl -s -X DELETE '$BASE_URL/api/grimorio/stats' | grep -q 'success'" \
    "success"

# Test 18: Obtener logs recientes
run_test "Obtener logs recientes" \
    "curl -s '$BASE_URL/api/grimorio/stats?action=logs&limit=10' | grep -q 'success'" \
    "success"

# Test 19: Obtener logs de errores
run_test "Obtener logs de errores" \
    "curl -s '$BASE_URL/api/grimorio/stats?action=errors&limit=10' | grep -q 'success'" \
    "success"

echo "=========================================="
echo "RESUMEN DE TESTS"
echo "=========================================="
echo "Total de tests: $TOTAL_TESTS"
echo "Tests pasados: $PASSED_TESTS ✅"
echo "Tests fallidos: $FAILED_TESTS ❌"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo "🎉 ¡TODOS LOS TESTS PASARON!"
    exit 0
else
    echo "⚠️  Algunos tests fallaron. Revisa los logs arriba."
    exit 1
fi
