#!/bin/bash

# Script de Verificación - Integración ThingsBoard
# Verifica que todos los cambios se hayan aplicado correctamente

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  Verificación de Integración ThingsBoard en FUXA            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contadores
PASSED=0
FAILED=0

# Función para verificar
check() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((PASSED++))
    else
        echo -e "${RED}✗${NC} $1"
        ((FAILED++))
    fi
}

echo "1. Verificando archivos del driver..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verificar archivos del driver
test -f "server/runtime/devices/thingsboard/index.js"
check "  index.js existe"

test -f "server/runtime/devices/thingsboard/tb-rest-client.js"
check "  tb-rest-client.js existe"

test -f "server/runtime/devices/thingsboard/tb-mqtt-client.js"
check "  tb-mqtt-client.js existe"

test -f "server/runtime/devices/thingsboard/tb-device-mapper.js"
check "  tb-device-mapper.js existe"

echo ""
echo "2. Verificando cambios en device.js..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verificar import
grep -q "var ThingsBoardClient = require('./thingsboard');" server/runtime/devices/device.js
check "  Import de ThingsBoardClient"

# Verificar case en constructor
grep -q "} else if (data.type === DeviceEnum.ThingsBoard) {" server/runtime/devices/device.js
check "  Case en constructor"

# Verificar browse
grep -A2 "} else if (data.type === DeviceEnum.ThingsBoard) {" server/runtime/devices/device.js | grep -q "comm.browse"
check "  Soporte browse"

# Verificar DeviceEnum
grep -q "ThingsBoard: 'ThingsBoard'" server/runtime/devices/device.js
check "  ThingsBoard en DeviceEnum"

# Verificar loadPlugin
grep -q "} else if (type === DeviceEnum.ThingsBoard) {" server/runtime/devices/device.js
check "  ThingsBoard en loadPlugin"

echo ""
echo "3. Verificando cambios en device.ts..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verificar DeviceType enum
grep -q "ThingsBoard = 'ThingsBoard'" client/src/app/_models/device.ts
check "  ThingsBoard en DeviceType enum"

# Verificar descriptor
grep -q "ThingsBoard" client/src/app/_models/device.ts | grep -q "type:"
check "  ThingsBoard en descriptor"

echo ""
echo "4. Verificando dependencias..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verificar axios
grep -q '"axios"' server/package.json
check "  axios instalado"

# Verificar mqtt
grep -q '"mqtt"' server/package.json
check "  mqtt instalado"

echo ""
echo "5. Conteo de referencias..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Contar referencias en device.js
BACKEND_REFS=$(grep -c "ThingsBoard" server/runtime/devices/device.js)
echo "  Referencias en device.js: $BACKEND_REFS (esperado: 8)"
if [ "$BACKEND_REFS" -eq 8 ]; then
    echo -e "  ${GREEN}✓${NC} Correcto"
    ((PASSED++))
else
    echo -e "  ${RED}✗${NC} Incorrecto (encontrado: $BACKEND_REFS)"
    ((FAILED++))
fi

# Contar referencias en device.ts
FRONTEND_REFS=$(grep -c "ThingsBoard" client/src/app/_models/device.ts)
echo "  Referencias en device.ts: $FRONTEND_REFS (esperado: 2)"
if [ "$FRONTEND_REFS" -eq 2 ]; then
    echo -e "  ${GREEN}✓${NC} Correcto"
    ((PASSED++))
else
    echo -e "  ${RED}✗${NC} Incorrecto (encontrado: $FRONTEND_REFS)"
    ((FAILED++))
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    RESUMEN DE VERIFICACIÓN                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo -e "  ${GREEN}Pruebas pasadas:${NC} $PASSED"
echo -e "  ${RED}Pruebas fallidas:${NC} $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ ¡Todos los cambios se aplicaron correctamente!${NC}"
    echo ""
    echo "Próximos pasos:"
    echo "  1. Reiniciar servidor: cd server && npm start"
    echo "  2. Compilar frontend: cd client && npm run build"
    echo "  3. Abrir FUXA y verificar que ThingsBoard aparece en dispositivos"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Algunos cambios no se aplicaron correctamente${NC}"
    echo ""
    echo "Por favor revisa:"
    echo "  - THINGSBOARD_CHANGES_DIFF.md para ver los cambios exactos"
    echo "  - THINGSBOARD_CHANGES_APPLIED.md para ver el estado actual"
    echo ""
    exit 1
fi
