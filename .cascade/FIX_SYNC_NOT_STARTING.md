# Fix: ThingsBoard Sync Not Starting

## 🐛 Problema Identificado

### Síntomas:
```bash
curl http://localhost:1881/api/thingsboard/status
```

Response mostraba:
```json
{
  "initialized": true,
  "enabled": true,
  "sync": {
    "running": false,          ❌ NO está corriendo
    "deviceCount": 0,          ❌ Sin devices
    "lastSyncTime": null,
    "clientStatus": {
      "connected": true,
      "hasToken": true,
      "wsConnected": null,     ❌ WebSocket no conectado
      "reconnectAttempts": 0,
      "subscriptions": 0
    }
  }
}
```

```bash
curl http://localhost:1881/api/thingsboard/devices
```
Retornaba vacío (sin devices).

### Causa Raíz:

**Race Condition en la inicialización**

El problema estaba en `/server/runtime/index.js`:

```javascript
// ANTES (INCORRECTO):
thingsBoardMgr = new ThingsBoardManager(settings, logger);
thingsBoardMgr.init().then(() => {
    logger.info('runtime init thingsboard successful!', true);
}).catch(err => {
    logger.error(`runtime.failed-to-init thingsboard: ${err.message}`);
});

// Más adelante en start():
if (thingsBoardMgr && thingsBoardMgr.isEnabled()) {
    thingsBoardMgr.start().then(...)  // ❌ Se ejecutaba ANTES de que init() terminara
}
```

**Secuencia del problema:**
1. `init()` se llama de forma asíncrona (no se espera)
2. El código continúa inmediatamente
3. Cuando llega `start()`, la inicialización aún no ha terminado
4. `isEnabled()` puede retornar `false` o el sync no está listo
5. El sync nunca se inicia

---

## ✅ Solución Implementada

### Cambio 1: Auto-start después de init

**Archivo:** `/server/runtime/index.js` (líneas 78-92)

```javascript
// DESPUÉS (CORRECTO):
thingsBoardMgr = new ThingsBoardManager(settings, logger);
thingsBoardMgr.init().then(() => {
    logger.info('runtime init thingsboard successful!', true);
    // Auto-start if enabled after initialization completes
    if (thingsBoardMgr.isEnabled()) {
        thingsBoardMgr.start().then(() => {
            logger.info('runtime.thingsboard-auto-started', true);
        }).catch(err => {
            logger.error(`runtime.failed-to-auto-start-thingsboard: ${err.message}`);
        });
    }
}).catch(err => {
    logger.error(`runtime.failed-to-init thingsboard: ${err.message}`);
});
```

**Beneficios:**
- ✅ `start()` se llama DESPUÉS de que `init()` termine
- ✅ Garantiza que el cliente esté autenticado
- ✅ Garantiza que el sync esté inicializado
- ✅ No hay race condition

### Cambio 2: Remover start() duplicado

**Archivo:** `/server/runtime/index.js` (líneas 396-397)

```javascript
// ANTES:
if (thingsBoardMgr && thingsBoardMgr.isEnabled()) {
    thingsBoardMgr.start().then(...)  // ❌ Duplicado, innecesario
}

// DESPUÉS:
// ThingsBoard manager auto-starts after initialization
// No need to start here as it's already started in init callback
```

---

## 🧪 Cómo Verificar el Fix

### 1. Reiniciar FUXA
```bash
cd /home/jsalazar-fcore/FUXA/server
# Detener FUXA (Ctrl+C)
npm start
```

### 2. Logs Esperados

Buscar en los logs la secuencia correcta:

```
[INF] thingsboard: initializing...
[INF] thingsboard-config: loaded from file
[INF] thingsboard-client: authenticating with 192.168.31.113...
[INF] thingsboard-client: authenticated successfully
[INF] thingsboard: initialized successfully
[INF] runtime init thingsboard successful!
[INF] thingsboard-sync: starting...                    ✅ DEBE APARECER
[INF] thingsboard-client: retrieved X devices          ✅ DEBE APARECER
[INF] thingsboard-sync: synced X devices               ✅ DEBE APARECER
[INF] runtime.thingsboard-auto-started                 ✅ NUEVO LOG
[INF] devices.load: loaded X ThingsBoard devices       ✅ DEBE APARECER
[INF] thingsboard-client: WebSocket connected          ✅ DEBE APARECER
[INF] thingsboard-sync: subscribed to X devices        ✅ DEBE APARECER
```

### 3. Verificar Status API

```bash
curl http://localhost:1881/api/thingsboard/status
```

**Response esperada:**
```json
{
  "initialized": true,
  "enabled": true,
  "sync": {
    "running": true,              ✅ AHORA true
    "deviceCount": 10,            ✅ Número de devices
    "lastSyncTime": 1729429200000,✅ Timestamp
    "clientStatus": {
      "connected": true,
      "hasToken": true,
      "wsConnected": true,        ✅ AHORA true
      "reconnectAttempts": 0,
      "subscriptions": 10         ✅ Número de suscripciones
    }
  }
}
```

### 4. Verificar Devices

```bash
curl http://localhost:1881/api/thingsboard/devices
```

**Response esperada:**
```json
[
  {
    "id": "tb_abc123...",
    "name": "test01",
    "type": "ThingsBoard",
    "enabled": true,
    "readonly": true,
    "source": "thingsboard",
    "tags": {
      "tb_abc123_temperature": {
        "id": "tb_abc123_temperature",
        "name": "temperature",
        "value": 25.5,
        "timestamp": 1729429200000
      }
    }
  },
  ...
]
```

### 5. Verificar en FUXA UI

1. Abrir http://localhost:1881
2. Ir a **Dispositivos**
3. Deberías ver los devices de ThingsBoard con:
   - Prefijo `tb_` en el ID
   - Type: `ThingsBoard`
   - Source: `thingsboard`
   - Readonly: `true`

---

## 📊 Comparación Antes/Después

| Aspecto | Antes ❌ | Después ✅ |
|---------|---------|-----------|
| **Sync Running** | `false` | `true` |
| **Device Count** | `0` | `10` (ejemplo) |
| **WebSocket** | `null` | `true` |
| **Subscriptions** | `0` | `10` (ejemplo) |
| **Devices API** | `[]` (vacío) | Array con devices |
| **FUXA UI** | Sin devices TB | Devices TB visibles |

---

## 🔍 Debugging

Si después del fix aún no funciona:

### 1. Verificar que ThingsBoard está accesible
```bash
ping 192.168.31.113
curl http://192.168.31.113:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"tenant@thingsboard.org","password":"tenant"}'
```

### 2. Verificar configuración
```bash
cat /home/jsalazar-fcore/FUXA/FUXA/thingsboard-config.json
```

Debe tener:
- `"enabled": true`
- `"host": "192.168.31.113"`
- `"port": 8081`

### 3. Forzar sincronización manual
```bash
curl -X POST http://localhost:1881/api/thingsboard/sync
```

### 4. Revisar logs completos
```bash
# En la terminal donde corre FUXA
grep -i "thingsboard" 
```

Buscar errores con `[ERR]` o `[WARN]`.

---

## 🎯 Checklist de Verificación

Después de reiniciar FUXA:

- [ ] Log muestra `runtime init thingsboard successful!`
- [ ] Log muestra `thingsboard-sync: starting...`
- [ ] Log muestra `thingsboard-sync: synced X devices`
- [ ] Log muestra `runtime.thingsboard-auto-started`
- [ ] Log muestra `WebSocket connected`
- [ ] API `/status` muestra `"running": true`
- [ ] API `/status` muestra `"deviceCount" > 0`
- [ ] API `/devices` retorna array con devices
- [ ] FUXA UI muestra devices de ThingsBoard

---

## 📝 Archivos Modificados

1. `/server/runtime/index.js`
   - Líneas 78-92: Auto-start después de init
   - Líneas 396-397: Remover start duplicado

2. `/client/src/app/editor/editor.component.ts` (fix anterior)
   - Líneas 1126-1129: Validación de view undefined

---

## 🚀 Siguiente Paso

**Reinicia FUXA y verifica que los devices de ThingsBoard aparezcan:**

```bash
cd /home/jsalazar-fcore/FUXA/server
npm start
```

Luego verifica:
```bash
curl http://localhost:1881/api/thingsboard/status
curl http://localhost:1881/api/thingsboard/devices
```

Si todo está correcto, deberías ver los 10 devices de ThingsBoard (test01-test07, eshh, Thermostat T1, Thermostat T2) en FUXA.
