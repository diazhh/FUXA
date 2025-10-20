# Flujo de Datos en Tiempo Real

## 🔄 Visión General

FUXA obtiene valores de ThingsBoard mediante **polling HTTP** cada 1 segundo para los tags que están activos en Lab/Home.

---

## 📡 Mecanismo de Polling

### Configuración Actual

```javascript
// Intervalo de polling
const POLLING_INTERVAL = 1000; // 1 segundo

// Ubicación: /server/runtime/index.js
setInterval(async () => {
    // Consultar ThingsBoard para tags suscritos
}, POLLING_INTERVAL);
```

### Características

- **Intervalo:** 1 segundo (1000ms)
- **Método:** HTTP GET
- **Endpoint:** `/api/plugins/telemetry/DEVICE/{id}/values/timeseries`
- **Optimización:** Agrupa tags por device para minimizar peticiones
- **Detección de cambios:** Solo emite eventos si el valor cambió

---

## 🎬 Flujo Completo: Desde ThingsBoard hasta el UI

### Paso 1: Usuario Abre Lab/Home

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Frontend: Usuario abre Lab                               │
│    ↓                                                         │
│ 2. Frontend: Lee proyecto desde BD                          │
│    ↓                                                         │
│ 3. Frontend: Encuentra elementos con tags ThingsBoard       │
│    Ejemplo: Output con variableId="tb:622b4ba0:temperatura" │
│    ↓                                                         │
│ 4. Frontend: Conecta WebSocket con backend                  │
│    ↓                                                         │
│ 5. Frontend: Emit "device-tags-subscribe"                   │
│    Payload: {                                                │
│      tagsId: ["tb:622b4ba0:temperatura", "tb:622b4ba0:..."],│
│      sendLastValue: true                                     │
│    }                                                         │
└─────────────────────────────────────────────────────────────┘
```

### Paso 2: Backend Recibe Suscripción

```
┌─────────────────────────────────────────────────────────────┐
│ 6. Backend: Recibe "device-tags-subscribe"                  │
│    ↓                                                         │
│ 7. Backend: Procesa cada tag                                │
│    Para "tb:622b4ba0:temperatura":                          │
│    ├─ Split por ":" → ["tb", "622b4ba0", "temperatura"]    │
│    ├─ deviceId = "622b4ba0"                                 │
│    └─ key = "temperatura"                                   │
│    ↓                                                         │
│ 8. Backend: Agrega a tbTagSubscriptions Map                 │
│    tbTagSubscriptions.set("tb:622b4ba0:temperatura", {      │
│      deviceId: "622b4ba0",                                   │
│      key: "temperatura",                                     │
│      lastValue: null                                         │
│    })                                                        │
│    ↓                                                         │
│ 9. Backend: Log "subscribed to ThingsBoard tag..."          │
│    ↓                                                         │
│ 10. Backend: Log "total ThingsBoard subscriptions: 1"       │
└─────────────────────────────────────────────────────────────┘
```

### Paso 3: Envío de Valor Inicial

```
┌─────────────────────────────────────────────────────────────┐
│ 11. Backend: sendThingsBoardInitialValues()                 │
│     ↓                                                        │
│ 12. Backend: Agrupa tags por device                         │
│     deviceTags = {                                           │
│       "622b4ba0": ["temperatura", "humedad"]                │
│     }                                                        │
│     ↓                                                        │
│ 13. Backend: Para cada device, consulta ThingsBoard         │
│     GET /api/plugins/telemetry/DEVICE/622b4ba0/values/...   │
│     ?keys=temperatura,humedad                                │
│     ↓                                                        │
│ 14. ThingsBoard: Retorna valores                            │
│     {                                                        │
│       "temperatura": [{"ts": 1234567890, "value": "25.3"}], │
│       "humedad": [{"ts": 1234567890, "value": "65.8"}]      │
│     }                                                        │
│     ↓                                                        │
│ 15. Backend: Procesa respuesta                              │
│     Para cada key:                                           │
│     ├─ Extrae value y timestamp                             │
│     ├─ Actualiza lastValue en tbTagSubscriptions            │
│     └─ Crea objeto de valores                               │
│     ↓                                                        │
│ 16. Backend: Emit "device-value:changed"                    │
│     {                                                        │
│       id: "thingsboard",                                     │
│       values: {                                              │
│         "tb:622b4ba0:temperatura": {                        │
│           id: "tb:622b4ba0:temperatura",                   │
│           value: "25.3",                                     │
│           ts: 1234567890,                                    │
│           daq: false                                         │
│         }                                                    │
│       }                                                      │
│     }                                                        │
│     ↓                                                        │
│ 17. Backend: Envía por WebSocket al frontend                │
└─────────────────────────────────────────────────────────────┘
```

### Paso 4: Frontend Recibe Valor Inicial

```
┌─────────────────────────────────────────────────────────────┐
│ 18. Frontend: Recibe "device-value:changed"                 │
│     ↓                                                        │
│ 19. Frontend: Procesa valores                               │
│     Para cada tag en values:                                 │
│     ├─ Busca elemento UI que usa ese tag                    │
│     └─ Actualiza valor en el elemento                       │
│     ↓                                                        │
│ 20. Frontend: Renderiza UI con nuevo valor                  │
│     Output muestra: "25.3"                                   │
└─────────────────────────────────────────────────────────────┘
```

### Paso 5: Polling Continuo (Cada 1 Segundo)

```
┌─────────────────────────────────────────────────────────────┐
│ [Cada 1 segundo]                                             │
│                                                              │
│ 21. Backend: Polling interval se ejecuta                    │
│     ↓                                                        │
│ 22. Backend: Verifica tbTagSubscriptions.size > 0           │
│     ↓                                                        │
│ 23. Backend: Log "polling X ThingsBoard tags"               │
│     ↓                                                        │
│ 24. Backend: Agrupa tags por device                         │
│     deviceTags = {                                           │
│       "622b4ba0": ["temperatura", "humedad"]                │
│     }                                                        │
│     ↓                                                        │
│ 25. Backend: Para cada device:                              │
│     GET /api/plugins/telemetry/DEVICE/622b4ba0/values/...   │
│     ?keys=temperatura,humedad                                │
│     ↓                                                        │
│ 26. ThingsBoard: Retorna valores actuales                   │
│     {                                                        │
│       "temperatura": [{"ts": 1234567891, "value": "25.5"}], │
│       "humedad": [{"ts": 1234567891, "value": "65.8"}]      │
│     }                                                        │
│     ↓                                                        │
│ 27. Backend: Log "received telemetry for device..."         │
│     ↓                                                        │
│ 28. Backend: Para cada key:                                 │
│     ├─ newValue = "25.5"                                    │
│     ├─ lastValue = "25.3"                                   │
│     ├─ changed = (newValue !== lastValue) → true           │
│     └─ Log "tag ... old: 25.3, new: 25.5, changed: true"   │
│     ↓                                                        │
│ 29. Backend: Actualiza lastValue = "25.5"                   │
│     ↓                                                        │
│ 30. Backend: Log "emitting value for ... = 25.5"            │
│     ↓                                                        │
│ 31. Backend: Emit "device-value:changed"                    │
│     {                                                        │
│       id: "thingsboard",                                     │
│       values: {                                              │
│         "tb:622b4ba0:temperatura": {                        │
│           id: "tb:622b4ba0:temperatura",                   │
│           value: "25.5",                                     │
│           ts: 1234567891,                                    │
│           daq: false                                         │
│         }                                                    │
│       }                                                      │
│     }                                                        │
│     ↓                                                        │
│ 32. Backend: Envía por WebSocket al frontend                │
│     ↓                                                        │
│ 33. Frontend: Recibe evento                                 │
│     ↓                                                        │
│ 34. Frontend: Actualiza UI                                  │
│     Output muestra: "25.5"                                   │
│     ↓                                                        │
│ 35. [Espera 1 segundo]                                       │
│     ↓                                                        │
│ 36. [Repite desde paso 21]                                  │
└─────────────────────────────────────────────────────────────┘
```

### Paso 6: Usuario Cierra Lab/Home

```
┌─────────────────────────────────────────────────────────────┐
│ 37. Frontend: Usuario cierra Lab                            │
│     ↓                                                        │
│ 38. Frontend: Desconecta WebSocket                          │
│     ↓                                                        │
│ 39. Backend: Detecta desconexión                            │
│     ↓                                                        │
│ 40. Backend: Limpia tbTagSubscriptions                      │
│     tbTagSubscriptions.clear()                               │
│     ↓                                                        │
│ 41. Backend: Log "total ThingsBoard subscriptions: 0"       │
│     ↓                                                        │
│ 42. Backend: Polling continúa pero no hace nada             │
│     (size === 0, return early)                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 Optimizaciones Implementadas

### 1. Agrupación de Tags por Device

En lugar de hacer una petición HTTP por cada tag:

```javascript
// ❌ Ineficiente (3 peticiones)
GET /api/.../DEVICE/622b4ba0/values/timeseries?keys=temperatura
GET /api/.../DEVICE/622b4ba0/values/timeseries?keys=humedad
GET /api/.../DEVICE/622b4ba0/values/timeseries?keys=presion

// ✅ Eficiente (1 petición)
GET /api/.../DEVICE/622b4ba0/values/timeseries?keys=temperatura,humedad,presion
```

**Código:**
```javascript
// Agrupar tags por device
const deviceTags = new Map();
for (const [tagId, info] of tbTagSubscriptions) {
    if (!deviceTags.has(info.deviceId)) {
        deviceTags.set(info.deviceId, []);
    }
    deviceTags.get(info.deviceId).push(info.key);
}

// Una petición por device
for (const [deviceId, keys] of deviceTags) {
    const telemetry = await thingsBoardMgr.getLatestTelemetry(deviceId, keys);
    // ...
}
```

### 2. Detección de Cambios

Solo emite eventos si el valor cambió:

```javascript
const newValue = data.value;
const changed = info.lastValue !== newValue;

if (changed) {  // Solo si cambió
    info.lastValue = newValue;
    events.emit('device-value:changed', { ... });
}
```

**Beneficio:** Reduce tráfico WebSocket y re-renders en frontend

### 3. Flag de Polling Activo

Evita ejecuciones concurrentes:

```javascript
let tbPollingActive = false;

setInterval(async () => {
    if (tbPollingActive) {
        return;  // Aún procesando anterior
    }
    
    tbPollingActive = true;
    try {
        // Consultar ThingsBoard
    } finally {
        tbPollingActive = false;
    }
}, 1000);
```

**Beneficio:** Evita sobrecarga si una consulta tarda más de 1 segundo

### 4. Early Return si No Hay Suscripciones

```javascript
if (tbTagSubscriptions.size === 0) {
    return;  // No hacer nada si no hay tags suscritos
}
```

**Beneficio:** No hace peticiones innecesarias cuando Lab/Home está cerrado

---

## 📊 Rendimiento

### Escenario 1: 1 Device, 3 Tags

```
Peticiones HTTP por segundo: 1
Datos transferidos: ~500 bytes/segundo
Eventos WebSocket emitidos: 0-3 (solo si cambian)
```

### Escenario 2: 5 Devices, 20 Tags

```
Peticiones HTTP por segundo: 5
Datos transferidos: ~2.5 KB/segundo
Eventos WebSocket emitidos: 0-20 (solo si cambian)
```

### Escenario 3: 10 Devices, 100 Tags

```
Peticiones HTTP por segundo: 10
Datos transferidos: ~12 KB/segundo
Eventos WebSocket emitidos: 0-100 (solo si cambian)
```

**Nota:** El tráfico real depende de cuántos valores cambien por segundo.

---

## ⚡ Latencia

### Latencia Total (Valor cambia en ThingsBoard → UI actualizado)

```
1. Valor cambia en ThingsBoard: T0
   ↓
2. Espera hasta próximo polling: 0-1000ms (promedio 500ms)
   ↓
3. Petición HTTP a ThingsBoard: 10-50ms
   ↓
4. Procesamiento en backend: 1-5ms
   ↓
5. Envío por WebSocket: 1-10ms
   ↓
6. Procesamiento en frontend: 1-5ms
   ↓
7. Render en UI: 1-16ms (60 FPS)

Total: 14-1086ms (promedio ~540ms)
```

**Latencia Promedio:** ~500ms

**Latencia Máxima:** ~1 segundo

---

## 🔮 Mejoras Futuras: WebSocket

### Implementación Futura con WebSocket de ThingsBoard

```javascript
// Conectar WebSocket
await thingsBoardClient.connectWebSocket();

// Suscribirse a telemetría
thingsBoardClient.subscribeToTelemetry(deviceId, ['temperatura', 'humedad']);

// Recibir actualizaciones en tiempo real
thingsBoardClient.on('telemetry-update', (data) => {
    // Emitir a frontend inmediatamente
    events.emit('device-value:changed', { ... });
});
```

**Ventajas:**
- ✅ Latencia < 100ms (vs ~500ms actual)
- ✅ Menos carga en ThingsBoard (no polling)
- ✅ Actualizaciones instantáneas
- ✅ Menos tráfico de red

**Desventajas:**
- ❌ Más complejo de implementar
- ❌ Requiere gestión de reconexiones
- ❌ Más difícil de debuggear

---

## 🐛 Debugging

### Ver Logs de Polling

```bash
cd /home/jsalazar-fcore/FUXA/server
tail -f _logs/fuxa.log | grep -E "polling|telemetry|emitting"
```

**Output esperado:**
```
[info] runtime: polling 3 ThingsBoard tags
[info] runtime: received telemetry for device 622b4ba0: {"temperatura":[...]}
[info] runtime: tag tb:622b4ba0:temperatura - old: 25.3, new: 25.5, changed: true
[info] runtime: emitting value for tb:622b4ba0:temperatura = 25.5
```

### Ver Suscripciones Activas

```bash
tail -f _logs/fuxa.log | grep "total ThingsBoard subscriptions"
```

**Output esperado:**
```
[info] runtime: total ThingsBoard subscriptions: 3
```

### Ver Tráfico WebSocket (Frontend)

1. Abrir DevTools (F12)
2. Ir a Network → WS
3. Click en conexión WebSocket
4. Ver Messages

**Mensajes esperados:**
```
→ {"cmd":"device-tags-subscribe","tagsId":["tb:622b4ba0:temperatura"]}
← {"cmd":"device-values","id":"thingsboard","values":{...}}
```

---

## 📋 Checklist de Verificación

- [ ] Polling se ejecuta cada 1 segundo
- [ ] Tags se agrupan por device
- [ ] Solo se emiten eventos si el valor cambió
- [ ] Suscripciones se limpian al cerrar Lab/Home
- [ ] Logs muestran "polling X ThingsBoard tags"
- [ ] Logs muestran "received telemetry for device..."
- [ ] Logs muestran "emitting value for..."
- [ ] Frontend recibe eventos "device-value:changed"
- [ ] UI se actualiza con nuevos valores

---

## 📚 Referencias

- **Código de Polling:** `/server/runtime/index.js` (startThingsBoardPolling)
- **Código de Suscripciones:** `/server/runtime/index.js` (DEVICE_TAGS_SUBSCRIBE handler)
- **Código de Cliente:** `/server/runtime/thingsboard/tb-client.js`
