# Arquitectura Directa - ThingsBoard como Fuente Única de Verdad

## ✅ Principio Fundamental Implementado

**FUXA NO almacena ni replica datos de ThingsBoard**

Toda la información se consulta **on-demand** directamente desde ThingsBoard.

---

## 🔄 Arquitectura ANTES vs DESPUÉS

### ❌ ANTES (Incorrecto - Replicación):
```
ThingsBoard
    ↓
[Sync Service] → Copia devices cada 30s
    ↓
[Memory Cache] → Almacena devices y telemetría
    ↓
[Device Manager] → Carga copias locales
    ↓
[Tag Selection] → Muestra datos replicados
```

**Problemas:**
- ❌ Duplicación de datos
- ❌ Almacenamiento local
- ❌ Sincronización periódica
- ❌ No es fuente única de verdad
- ❌ Devices aparecen como "conexiones"

### ✅ DESPUÉS (Correcto - Consulta Directa):
```
ThingsBoard ← [FUXA consulta cuando necesita]
    ↑
[ThingsBoard Manager] → Gateway directo (sin storage)
    ↑
[API Endpoints] → Consultas on-demand
    ↑
[Frontend] → Solicita datos cuando los necesita
```

**Beneficios:**
- ✅ Sin duplicación
- ✅ Sin almacenamiento local
- ✅ Sin sincronización
- ✅ ThingsBoard es fuente única de verdad
- ✅ Devices NO aparecen como conexiones

---

## 📦 Componentes Modificados

### 1. ThingsBoard Manager (`/server/runtime/thingsboard/index.js`)

**ELIMINADO:**
- ❌ ThingsBoardSync (ya no existe)
- ❌ Event listeners de sync
- ❌ Método `forceSync()`
- ❌ Métodos síncronos `getDevices()`, `getDevice()`

**AGREGADO:**
- ✅ Métodos **async** para consultas on-demand:
  - `async getDevices()` - Consulta devices de TB
  - `async getDevice(deviceId)` - Consulta device específico
  - `async getTelemetryKeys(deviceId)` - Consulta telemetry keys
  - `async getLatestTelemetry(deviceId, keys)` - Consulta telemetría
  - `async sendTelemetry(deviceId, telemetry)` - Escribe telemetría

**Comportamiento:**
```javascript
// Cada llamada consulta ThingsBoard en tiempo real
const devices = await runtime.thingsboard.getDevices();
// NO hay cache, NO hay storage
```

### 2. Device Manager (`/server/runtime/devices/index.js`)

**ELIMINADO:**
```javascript
// ANTES: Cargaba devices de ThingsBoard
if (runtime.thingsboard && runtime.thingsboard.isEnabled()) {
    const tbDevices = runtime.thingsboard.getDevices();
    for (const tbDevice of tbDevices) {
        tempdevices[tbDevice.id] = tbDevice;  // ❌ Replicación
    }
}
```

**AHORA:**
```javascript
// ThingsBoard devices are NOT loaded here
// They are queried on-demand when needed
// This ensures ThingsBoard is the single source of truth
```

### 3. Runtime (`/server/runtime/index.js`)

**ELIMINADO:**
- ❌ Event listener `devices-synced`
- ❌ Recarga de devices después de sync
- ❌ `devices.load()` después de start

**AHORA:**
```javascript
// Initialize ThingsBoard Manager as direct gateway (no sync, no storage)
thingsBoardMgr.init().then(() => {
    if (thingsBoardMgr.isEnabled()) {
        thingsBoardMgr.start().then(() => {
            logger.info('runtime.thingsboard-gateway-ready', true);
        });
    }
});
```

### 4. API Endpoints (`/server/api/thingsboard/index.js`)

**MODIFICADO:**
Todos los endpoints ahora son **async** y consultan on-demand:

#### GET `/api/thingsboard/devices`
```javascript
// ANTES: Retornaba cache
const devices = runtime.thingsboard.getDevices(); // Síncrono, desde cache

// AHORA: Consulta directa
const devices = await runtime.thingsboard.getDevices(); // Async, desde TB
```

#### GET `/api/thingsboard/device/:id/keys` (NUEVO)
```javascript
// Consulta telemetry keys directamente de ThingsBoard
const keys = await runtime.thingsboard.getTelemetryKeys(deviceId);
```

#### GET `/api/thingsboard/device/:id/telemetry` (NUEVO)
```javascript
// Consulta telemetría directamente de ThingsBoard
const telemetry = await runtime.thingsboard.getLatestTelemetry(deviceId, keys);
```

**ELIMINADO:**
- ❌ POST `/api/thingsboard/sync` - Ya no hay sync

---

## 🔌 Nuevos Endpoints API

### 1. GET `/api/thingsboard/devices`
Obtiene lista de devices directamente de ThingsBoard

**Response:**
```json
[
  {
    "id": {"id": "abc123...", "entityType": "DEVICE"},
    "name": "Temperature Sensor",
    "type": "default",
    "label": "Sensor"
  }
]
```

### 2. GET `/api/thingsboard/device/:id`
Obtiene device específico

### 3. GET `/api/thingsboard/device/:id/keys`
Obtiene telemetry keys del device

**Response:**
```json
["temperature", "humidity", "pressure"]
```

### 4. GET `/api/thingsboard/device/:id/telemetry`
Obtiene telemetría actual del device

**Query params:**
- `keys` (opcional): Lista de keys separadas por coma

**Response:**
```json
{
  "temperature": {
    "ts": 1729429200000,
    "value": 25.5
  },
  "humidity": {
    "ts": 1729429200000,
    "value": 60.2
  }
}
```

---

## 🎯 Cómo Funciona Ahora

### Escenario 1: Usuario abre Tag Selection

```
1. Frontend abre Tag Selection
2. Frontend llama: GET /api/thingsboard/devices
3. API llama: await runtime.thingsboard.getDevices()
4. Manager llama: await this.client.getDevices()
5. Client consulta: GET http://192.168.31.113:8081/api/tenant/devices
6. ThingsBoard responde con devices
7. Response llega al frontend
8. Tag Selection muestra devices
```

**NO hay:**
- ❌ Cache local
- ❌ Sincronización previa
- ❌ Almacenamiento en memoria

### Escenario 2: Usuario selecciona un device

```
1. Frontend selecciona device "abc123"
2. Frontend llama: GET /api/thingsboard/device/abc123/keys
3. API llama: await runtime.thingsboard.getTelemetryKeys('abc123')
4. Client consulta: GET http://192.168.31.113:8081/api/plugins/telemetry/DEVICE/abc123/keys/timeseries
5. ThingsBoard responde con keys: ["temperature", "humidity"]
6. Tag Selection muestra telemetry keys como tags disponibles
```

### Escenario 3: Usuario usa un tag en el editor

```
1. Editor necesita valor de tag "temperature" del device "abc123"
2. Frontend llama: GET /api/thingsboard/device/abc123/telemetry?keys=temperature
3. API llama: await runtime.thingsboard.getLatestTelemetry('abc123', ['temperature'])
4. Client consulta: GET http://192.168.31.113:8081/api/plugins/telemetry/DEVICE/abc123/values/timeseries?keys=temperature
5. ThingsBoard responde: {"temperature": {"ts": 123, "value": 25.5}}
6. Editor muestra valor actual
```

### Escenario 4: Usuario escribe un valor

```
1. Editor escribe valor 30 a tag "temperature"
2. Frontend llama: POST /api/thingsboard/device/abc123/telemetry
3. API llama: await runtime.thingsboard.sendTelemetry('abc123', {temperature: 30})
4. Client envía: POST http://192.168.31.113:8081/api/plugins/telemetry/DEVICE/abc123/timeseries/ANY
5. ThingsBoard actualiza el valor
6. Confirmación al frontend
```

---

## 📊 Logs Esperados

### Al iniciar FUXA:
```
[INF] FUXA V.1.2.7-2525
[INF] thingsboard: initializing direct gateway...
[INF] thingsboard-config: loaded from file
[INF] thingsboard-client: authenticating with 192.168.31.113...
[INF] thingsboard-client: authenticated successfully
[INF] thingsboard: direct gateway initialized successfully
[INF] runtime init thingsboard successful!
[INF] FUXA started!
[INF] runtime.thingsboard-gateway-ready
```

**NO aparecen:**
- ❌ "syncing devices..."
- ❌ "synced X devices"
- ❌ "devices.load: loaded X ThingsBoard devices"
- ❌ "WebSocket connecting..."

### Al consultar devices:
```
[INF] thingsboard: fetched 17 devices on-demand
```

### Al consultar telemetría:
```
[INF] thingsboard: fetched telemetry keys for device abc123
[INF] thingsboard: fetched latest telemetry for device abc123
```

---

## ✅ Verificación

### 1. Devices NO aparecen en Device Manager
```bash
# Devices locales (Modbus, OPC UA, etc.)
curl http://localhost:1881/api/project | jq '.devices'
# NO debe incluir devices de ThingsBoard
```

### 2. Devices se consultan on-demand
```bash
# Cada llamada consulta ThingsBoard
curl http://localhost:1881/api/thingsboard/devices
# Logs muestran: "fetched 17 devices on-demand"
```

### 3. Telemetría se consulta on-demand
```bash
# Obtener keys
curl http://localhost:1881/api/thingsboard/device/abc123/keys

# Obtener telemetría
curl http://localhost:1881/api/thingsboard/device/abc123/telemetry
```

### 4. Status NO muestra sync
```bash
curl http://localhost:1881/api/thingsboard/status
```

**Response esperada:**
```json
{
  "initialized": true,
  "enabled": true,
  "client": {
    "connected": true,
    "hasToken": true
  }
}
```

**NO debe tener:**
- ❌ `sync` object
- ❌ `deviceCount`
- ❌ `lastSyncTime`

---

## 🎉 Resultado Final

### ✅ Cumple con las reglas:
1. **Conexión Directa** ✅ - Consultas directas a ThingsBoard API
2. **Sin Base de Datos Local** ✅ - NO almacena devices ni telemetría
3. **Telemetría como Tags** ✅ - Telemetry keys se consultan on-demand
4. **Tiempo Real** ✅ - Cada consulta obtiene datos actuales
5. **Fuente Única de Verdad** ✅ - ThingsBoard es la única fuente

### ✅ Devices de ThingsBoard:
- **NO** aparecen en Device Manager
- **NO** aparecen como "conexiones"
- **NO** se almacenan localmente
- **SÍ** se consultan cuando se necesitan
- **SÍ** están disponibles en Tag Selection (vía API)

---

## 🚀 Próximo Paso

**Reiniciar FUXA y verificar:**

```bash
cd /home/jsalazar-fcore/FUXA/server
npm start
```

**Verificar logs:**
- ✅ "direct gateway initialized"
- ✅ "thingsboard-gateway-ready"
- ❌ NO debe aparecer "syncing devices"
- ❌ NO debe aparecer "devices.load: loaded X ThingsBoard devices"

**Probar API:**
```bash
# Devices on-demand
curl http://localhost:1881/api/thingsboard/devices

# Telemetry keys on-demand
curl http://localhost:1881/api/thingsboard/device/<ID>/keys

# Telemetría on-demand
curl http://localhost:1881/api/thingsboard/device/<ID>/telemetry
```

---

**Arquitectura correcta implementada: ThingsBoard como fuente única de verdad, sin replicación ni almacenamiento local** ✅
