# Tag Binding - ThingsBoard Integration

## ✅ Progreso Actual

### Implementado:
1. ✅ Tag Selection muestra telemetry keys de ThingsBoard
2. ✅ Tags tienen formato `tb:{deviceId}:{key}`
3. ✅ Backend reconoce tags de ThingsBoard en `getDeviceIdFromTag()`
4. ✅ Backend puede leer valores on-demand con `getTagValue()`
5. ✅ Backend puede escribir valores con `setTagValue()`

### Pendiente:
1. ❌ Polling en tiempo real para actualizar valores en Lab
2. ❌ Suscripción de tags vía WebSocket
3. ❌ Guardar configuración de tags en el proyecto

---

## 🔧 Cambios Implementados

### Archivo: `/server/runtime/devices/index.js`

#### 1. `getDeviceIdFromTag()` - Reconoce tags TB
```javascript
function getDeviceIdFromTag(sigid) {
    // Check if it's a ThingsBoard tag (format: tb:{deviceId}:{key})
    if (sigid && sigid.startsWith('tb:')) {
        return 'thingsboard'; // Virtual device ID for ThingsBoard
    }
    
    // ... código existente ...
}
```

#### 2. `getTagValue()` - Lee valores on-demand
```javascript
async function getTagValue(sigid, fully) {
    try {
        // Check if it's a ThingsBoard tag
        if (sigid && sigid.startsWith('tb:')) {
            const parts = sigid.split(':');
            if (parts.length === 3) {
                const deviceId = parts[1];
                const key = parts[2];
                
                if (runtime.thingsboard && runtime.thingsboard.isEnabled()) {
                    const telemetry = await runtime.thingsboard.getLatestTelemetry(deviceId, [key]);
                    if (telemetry && telemetry[key] && telemetry[key].length > 0) {
                        const data = telemetry[key][0];
                        if (fully) {
                            return {
                                id: sigid,
                                value: data.value,
                                ts: data.ts,
                                daq: false
                            };
                        } else {
                            return data.value;
                        }
                    }
                }
            }
            return null;
        }
        
        // ... código existente para otros devices ...
    }
}
```

#### 3. `setTagValue()` - Escribe valores a TB
```javascript
async function setTagValue(tagid, value) {
    try {
        // Check if it's a ThingsBoard tag
        if (tagid && tagid.startsWith('tb:')) {
            const parts = tagid.split(':');
            if (parts.length === 3) {
                const deviceId = parts[1];
                const key = parts[2];
                
                if (runtime.thingsboard && runtime.thingsboard.isEnabled()) {
                    const telemetry = { [key]: value };
                    await runtime.thingsboard.sendTelemetry(deviceId, telemetry);
                    return true;
                }
            }
            return null;
        }
        
        // ... código existente para otros devices ...
    }
}
```

---

## 🔄 Flujo de Lectura/Escritura

### Lectura (Implementado):
```
1. Frontend solicita valor de tag "tb:abc123:presion"
2. getTagValue() detecta formato "tb:"
3. Extrae deviceId="abc123" y key="presion"
4. Llama runtime.thingsboard.getLatestTelemetry(deviceId, [key])
5. ThingsBoard Manager consulta API
6. Retorna valor actual
```

### Escritura (Implementado):
```
1. Frontend escribe valor 30 a tag "tb:abc123:presion"
2. setTagValue() detecta formato "tb:"
3. Extrae deviceId="abc123" y key="presion"
4. Llama runtime.thingsboard.sendTelemetry(deviceId, {presion: 30})
5. ThingsBoard Manager envía a API
6. ThingsBoard actualiza el valor
```

---

## ❌ Problema Actual: No se Guardan ni Actualizan

### Síntoma 1: No se guarda la selección
Cuando seleccionas un tag de ThingsBoard en el editor, no se guarda en el proyecto.

**Causa:** El frontend probablemente valida que el tag existe en el proyecto antes de guardarlo, pero los tags de ThingsBoard no están en el proyecto.

**Solución Pendiente:** Modificar el frontend para permitir guardar tags con formato `tb:` sin validar que existan en el proyecto.

### Síntoma 2: No se muestran valores en Lab
Cuando abres Lab (runtime), los tags de ThingsBoard no muestran valores.

**Causa:** El sistema de polling/suscripción no está consultando ThingsBoard para actualizar valores en tiempo real.

**Solución Pendiente:** Implementar polling para tags suscritos de ThingsBoard.

---

## 🚀 Próximos Pasos

### Paso 1: Permitir Guardar Tags TB en el Proyecto

El frontend necesita permitir guardar tags con formato `tb:` sin validar que existan en devices del proyecto.

**Archivos a modificar:**
- `/client/src/app/...` (componente que guarda la configuración del elemento)

### Paso 2: Implementar Polling para Tags Suscritos

Cuando el frontend suscribe a tags (via WebSocket), necesitamos:

1. Detectar tags de ThingsBoard en la lista de suscripciones
2. Crear un polling interval para consultar esos tags
3. Emitir eventos `device-value:changed` cuando cambien
4. Enviar valores al frontend vía WebSocket

**Implementación sugerida en `/server/runtime/index.js`:**

```javascript
// Map to track ThingsBoard tag subscriptions
const tbTagSubscriptions = new Map(); // tagId -> { deviceId, key, lastValue }
let tbPollingInterval = null;

// Start polling for ThingsBoard tags
function startThingsBoardPolling() {
    if (tbPollingInterval) return;
    
    tbPollingInterval = setInterval(async () => {
        if (tbTagSubscriptions.size === 0) return;
        
        // Group tags by device to minimize API calls
        const deviceTags = new Map(); // deviceId -> [keys]
        for (const [tagId, info] of tbTagSubscriptions) {
            if (!deviceTags.has(info.deviceId)) {
                deviceTags.set(info.deviceId, []);
            }
            deviceTags.get(info.deviceId).push(info.key);
        }
        
        // Query each device
        for (const [deviceId, keys] of deviceTags) {
            try {
                const telemetry = await thingsBoardMgr.getLatestTelemetry(deviceId, keys);
                
                for (const key of keys) {
                    if (telemetry[key] && telemetry[key].length > 0) {
                        const data = telemetry[key][0];
                        const tagId = `tb:${deviceId}:${key}`;
                        const info = tbTagSubscriptions.get(tagId);
                        
                        if (info && info.lastValue !== data.value) {
                            info.lastValue = data.value;
                            
                            // Emit value change
                            events.emit('device-value:changed', {
                                id: 'thingsboard',
                                variableId: tagId,
                                value: data.value
                            });
                        }
                    }
                }
            } catch (err) {
                logger.error(`Failed to poll ThingsBoard device ${deviceId}: ${err.message}`);
            }
        }
    }, 5000); // Poll every 5 seconds
}

// Modify tag subscription handler
socket.on(Events.IoEventTypes.DEVICE_TAGS_SUBSCRIBE, (message) => {
    try {
        socket.tagsClientSubscriptions = message.tagsId;
        
        // Track ThingsBoard tags
        if (message.tagsId) {
            for (const tagId of message.tagsId) {
                if (tagId && tagId.startsWith('tb:')) {
                    const parts = tagId.split(':');
                    if (parts.length === 3) {
                        tbTagSubscriptions.set(tagId, {
                            deviceId: parts[1],
                            key: parts[2],
                            lastValue: null
                        });
                    }
                }
            }
        }
        
        // Start polling if needed
        if (tbTagSubscriptions.size > 0) {
            startThingsBoardPolling();
        }
        
        // ... código existente ...
    } catch (err) {
        logger.error(`${Events.IoEventTypes.DEVICE_TAGS_SUBSCRIBE}: ${err}`);
    }
});
```

### Paso 3: Limpiar Suscripciones al Desconectar

```javascript
socket.on('disconnect', () => {
    // Remove ThingsBoard subscriptions for this socket
    if (socket.tagsClientSubscriptions) {
        for (const tagId of socket.tagsClientSubscriptions) {
            if (tagId && tagId.startsWith('tb:')) {
                tbTagSubscriptions.delete(tagId);
            }
        }
    }
    
    // Stop polling if no more subscriptions
    if (tbTagSubscriptions.size === 0 && tbPollingInterval) {
        clearInterval(tbPollingInterval);
        tbPollingInterval = null;
    }
});
```

---

## 🧪 Testing

### Test 1: Verificar Lectura On-Demand
```bash
# En la consola del navegador (F12)
# Cuando tengas un tag de ThingsBoard en el editor
# Deberías ver requests a:
GET /api/thingsboard/device/{deviceId}/telemetry?keys={key}
```

### Test 2: Verificar Escritura
```javascript
// En la consola del navegador
// Escribe un valor a un tag de ThingsBoard
// Deberías ver request a:
POST /api/thingsboard/device/{deviceId}/telemetry
// Con body: {"{key}": value}
```

### Test 3: Verificar Polling (Después de implementar)
```
1. Abre Lab
2. Agrega un elemento con tag de ThingsBoard
3. El valor debería actualizarse cada 5 segundos
4. Cambia el valor en ThingsBoard
5. Debería reflejarse en FUXA en máximo 5 segundos
```

---

## 📝 Estado Actual

### ✅ Funciona:
- Tag Selection muestra telemetry keys
- Backend puede leer valores on-demand
- Backend puede escribir valores

### ❌ No Funciona:
- No se guarda la selección del tag en el proyecto
- No se muestran valores en Lab (no hay polling)
- No hay actualización en tiempo real

### 🔄 Siguiente Acción:
Implementar el polling para tags suscritos de ThingsBoard en `/server/runtime/index.js`

---

**¿Quieres que implemente el polling ahora para que los valores se actualicen en tiempo real?**
