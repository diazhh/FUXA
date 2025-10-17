#!/bin/bash

# Script para probar el descubrimiento automático de dispositivos ThingsBoard
# Este script monitorea los logs de FUXA para verificar que el descubrimiento periódico funciona

echo "=== Test de Descubrimiento Automático de ThingsBoard ==="
echo ""
echo "Este script monitoreará los logs de FUXA durante 2 minutos"
echo "para verificar que el descubrimiento periódico está funcionando."
echo ""
echo "Presiona Ctrl+C para detener el monitoreo en cualquier momento."
echo ""
echo "Buscando eventos de descubrimiento..."
echo "================================================"
echo ""

# Función para mostrar timestamp
timestamp() {
    date "+%H:%M:%S"
}

# Contador de descubrimientos
count=0

# Monitorear logs por 2 minutos (120 segundos)
timeout 120 tail -f /home/jsalazar/FUXA/server/_logs/fuxa1.log | while read line; do
    # Buscar líneas relacionadas con descubrimiento
    if echo "$line" | grep -q "periodic device discovery"; then
        count=$((count + 1))
        echo "[$(timestamp)] 🔄 Descubrimiento periódico ejecutado (#$count)"
        echo "$line"
        echo ""
    elif echo "$line" | grep -q "discovery complete"; then
        echo "[$(timestamp)] ✅ Descubrimiento completado"
        echo "$line"
        echo ""
    elif echo "$line" | grep -q "tags created"; then
        echo "[$(timestamp)] 📝 Tags creados/actualizados"
        echo "$line"
        echo ""
    elif echo "$line" | grep -q "emitting.*values with device id"; then
        # Extraer el número de valores
        values=$(echo "$line" | grep -oP 'emitting \K\d+')
        echo "[$(timestamp)] 📡 Emitiendo $values valores al UI"
    fi
done

echo ""
echo "================================================"
echo "Monitoreo finalizado."
echo ""
echo "Para verificar manualmente:"
echo "  tail -f /home/jsalazar/FUXA/server/_logs/fuxa1.log | grep -i discovery"
