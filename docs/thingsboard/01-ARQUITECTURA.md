# Arquitectura de Integración ThingsBoard

## 🏗️ Visión General

La integración entre FUXA y ThingsBoard sigue el principio de **"ThingsBoard como fuente única de verdad"**. FUXA NO almacena información de devices ni telemetría localmente, sino que consulta ThingsBoard directamente cuando se necesita.

---

## 📦 Componentes Principales

### 1. ThingsBoard Manager (`/server/runtime/thingsboard/index.js`)

**Responsabilidad:** Orquestador principal de la integración.

**Funciones:**
- Inicializar la conexión con ThingsBoard
- Gestionar el ciclo de vida del cliente
- Exponer métodos para consultar devices y telemetría
- Manejar actualizaciones de configuración

**Métodos Clave:**
```javascript
async init()                              // Inicializa la integración
async start()                             // Inicia el cliente
async getDevices()                        // Obtiene devices de ThingsBoard
async getDevice(deviceId)                 // Obtiene un device específico
async getTelemetryKeys(deviceId)          // Obtiene claves de telemetría
async getLatestTelemetry(deviceId, keys)  // Obtiene valores actuales
async sendTelemetry(deviceId, telemetry)  // Envía telemetría
getStatus()                               // Estado de la conexión
```

---

### 2. ThingsBoard Config (`/server/runtime/thingsboard/tb-config.js`)

**Responsabilidad:** Gestión de configuración y credenciales.

**Características:**
- Almacena credenciales en archivo JSON
- Encripta contraseñas con AES-256-CBC
- Valida configuración antes de guardar
- Proporciona valores por defecto

**Archivo de Configuración:**
```
/home/jsalazar-fcore/FUXA/_appdata/thingsboard-config.json
```

**Estructura:**
```json
{
  "enabled": true,
  "host": "192.168.31.113",
  "port": 8081,
  "protocol": "http",
  "username": "tenant@thingsboard.org",
  "password": "iv:encrypted_password",
  "syncInterval": 30000,
  "useWebSocket": true,
  "reconnectInterval": 5000,
  "maxReconnectAttempts": 10,
  "requestTimeout": 10000
}
```

**Métodos Clave:**
```javascript
async init()                    // Carga configuración
async load()                    // Lee archivo de configuración
async save(config)              // Guarda configuración
encrypt(text)                   // Encripta contraseña
decrypt(text)                   // Desencripta contraseña
validate(config)                // Valida configuración
```

---

### 3. ThingsBoard Client (`/server/runtime/thingsboard/tb-client.js`)

**Responsabilidad:** Comunicación HTTP/REST con ThingsBoard.

**Características:**
- Autenticación JWT con ThingsBoard
- Refresh automático de tokens
- Reintentos en caso de error 401
- Soporte para WebSocket (futuro)

**Endpoints ThingsBoard Utilizados:**
```
POST /api/auth/login                                    # Autenticación
GET  /api/tenant/devices                                # Listar devices
GET  /api/device/{deviceId}                             # Obtener device
GET  /api/plugins/telemetry/DEVICE/{id}/keys/timeseries # Claves de telemetría
GET  /api/plugins/telemetry/DEVICE/{id}/values/timeseries # Valores actuales
POST /api/plugins/telemetry/DEVICE/{id}/timeseries/ANY  # Enviar telemetría
```

**Métodos Clave:**
```javascript
async authenticate()                           // Autenticación con ThingsBoard
async refreshAuthToken()                       // Refresca token JWT
async getDevices(pageSize, page)              // Lista devices
async getDevice(deviceId)                      // Obtiene device por ID
async getTelemetryKeys(deviceId)              // Obtiene claves de telemetría
async getLatestTelemetry(deviceId, keys)      // Obtiene valores actuales
async sendTelemetry(deviceId, telemetry)      // Envía telemetría
```

---

## 🔄 Flujo de Inicialización

```
1. FUXA Server Start
   ↓
2. Runtime Init
   ↓
3. ThingsBoard Manager Init
   ↓
4. ThingsBoard Config Init
   ├─→ Load config file
   └─→ Decrypt password
   ↓
5. ThingsBoard Client Init
   ↓
6. Authenticate with ThingsBoard
   ├─→ POST /api/auth/login
   └─→ Receive JWT token
   ↓
7. ThingsBoard Manager Start
   ↓
8. Start Polling (1s interval)
   ↓
9. Ready to serve requests
```

---

## 🎯 Consultas On-Demand

### Cuando el usuario abre Tag Selection:

```
1. Frontend: Click "Tag Selection"
   ↓
2. Frontend: GET /api/thingsboard/devices
   ↓
3. Backend: ThingsBoard Manager.getDevices()
   ↓
4. Backend: ThingsBoard Client.getDevices()
   ↓
5. ThingsBoard API: GET /api/tenant/devices
   ↓
6. ThingsBoard API: Response with devices
   ↓
7. Backend: Return devices to frontend
   ↓
8. Frontend: Display devices in tree
   ↓
9. Frontend: User selects device
   ↓
10. Frontend: GET /api/thingsboard/device/{id}/keys
    ↓
11. Backend: ThingsBoard Manager.getTelemetryKeys(id)
    ↓
12. Backend: ThingsBoard Client.getTelemetryKeys(id)
    ↓
13. ThingsBoard API: GET /api/plugins/telemetry/DEVICE/{id}/keys/timeseries
    ↓
14. ThingsBoard API: Response with telemetry keys
    ↓
15. Backend: Return keys to frontend
    ↓
16. Frontend: Display telemetry keys as tags
    ↓
17. Frontend: User selects tag
    ↓
18. Frontend: Save tag ID as "tb:{deviceId}:{key}"
```

**Resultado:** El tag guardado en el proyecto es `tb:622b4ba0-a850-11f0-aabd-5b2d2a47a78c:temperatura`

---

## 📡 Polling en Tiempo Real

### Cuando el usuario abre Lab/Home:

```
1. Frontend: Open Lab/Home
   ↓
2. Frontend: Emit "device-tags-subscribe" via WebSocket
   ├─→ tagsId: ["tb:622b4ba0:temperatura", "tb:622b4ba0:humedad"]
   └─→ sendLastValue: true
   ↓
3. Backend: Receive subscription
   ↓
4. Backend: Add tags to tbTagSubscriptions Map
   ├─→ "tb:622b4ba0:temperatura" → { deviceId: "622b4ba0", key: "temperatura" }
   └─→ "tb:622b4ba0:humedad" → { deviceId: "622b4ba0", key: "humedad" }
   ↓
5. Backend: Send initial values
   ↓
6. Backend: Start polling (every 1 second)
   ↓
7. Polling Loop:
   ├─→ Group tags by device
   ├─→ GET /api/plugins/telemetry/DEVICE/{id}/values/timeseries?keys=temperatura,humedad
   ├─→ Parse response
   ├─→ Compare with last value
   ├─→ If changed: Emit "device-value:changed"
   └─→ Frontend receives update via WebSocket
   ↓
8. Frontend: Update UI with new values
```

**Intervalo de Polling:** 1 segundo (configurable en código)

---

## 🔌 Integración con Runtime

### En `/server/runtime/index.js`:

```javascript
// Variables globales
let thingsBoardMgr = null;
const tbTagSubscriptions = new Map();  // Tags suscritos
let tbPollingInterval = null;          // Intervalo de polling
let tbPollingActive = false;           // Flag de polling activo

// Inicialización
thingsBoardMgr = new ThingsBoardManager(settings, logger);
await thingsBoardMgr.init();
await thingsBoardMgr.start();
startThingsBoardPolling();

// Handler de suscripciones
socket.on('device-tags-subscribe', (message) => {
    for (const tagId of message.tagsId) {
        if (tagId.startsWith('tb:')) {
            const [_, deviceId, key] = tagId.split(':');
            tbTagSubscriptions.set(tagId, { deviceId, key, lastValue: null });
        }
    }
});

// Polling loop
setInterval(async () => {
    for (const [tagId, info] of tbTagSubscriptions) {
        const telemetry = await thingsBoardMgr.getLatestTelemetry(info.deviceId, [info.key]);
        const newValue = telemetry[info.key][0].value;
        
        if (info.lastValue !== newValue) {
            info.lastValue = newValue;
            events.emit('device-value:changed', {
                id: 'thingsboard',
                values: {
                    [tagId]: { id: tagId, value: newValue, ts: Date.now() }
                }
            });
        }
    }
}, 1000);
```

---

## 🗄️ Integración con Devices

### En `/server/runtime/devices/index.js`:

Los tags de ThingsBoard se manejan de forma especial:

```javascript
async function getTagValue(sigid, fully) {
    // Detectar tag de ThingsBoard
    if (sigid && sigid.startsWith('tb:')) {
        const [_, deviceId, key] = sigid.split(':');
        
        // Consultar ThingsBoard directamente
        const telemetry = await runtime.thingsboard.getLatestTelemetry(deviceId, [key]);
        
        if (telemetry && telemetry[key]) {
            return fully 
                ? { id: sigid, value: telemetry[key][0].value, ts: telemetry[key][0].ts }
                : telemetry[key][0].value;
        }
    }
    
    // Tags normales de FUXA
    // ...
}

async function setTagValue(tagid, value) {
    // Detectar tag de ThingsBoard
    if (tagid && tagid.startsWith('tb:')) {
        const [_, deviceId, key] = tagid.split(':');
        
        // Enviar a ThingsBoard directamente
        await runtime.thingsboard.sendTelemetry(deviceId, { [key]: value });
        return true;
    }
    
    // Tags normales de FUXA
    // ...
}
```

**Resultado:** Los scripts de FUXA pueden usar `getTag()` y `setTag()` con tags de ThingsBoard sin cambios.

---

## 🌐 API REST

### Endpoints Expuestos en `/server/api/thingsboard/index.js`:

```javascript
GET  /api/thingsboard/config           // Obtener configuración (sin password)
POST /api/thingsboard/config           // Actualizar configuración
GET  /api/thingsboard/status           // Estado de la conexión
GET  /api/thingsboard/devices          // Listar devices
GET  /api/thingsboard/device/:id       // Obtener device por ID
GET  /api/thingsboard/device/:id/keys  // Obtener claves de telemetría
GET  /api/thingsboard/device/:id/telemetry?keys=a,b  // Obtener telemetría
POST /api/thingsboard/test             // Probar conexión
```

Todos los endpoints requieren autenticación de FUXA.

---

## 🔐 Seguridad

### Encriptación de Contraseñas

Las contraseñas se encriptan con AES-256-CBC antes de guardarse:

```javascript
// Encriptación
const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
encrypted = cipher.update(password, 'utf8', 'hex') + cipher.final('hex');
stored = iv.toString('hex') + ':' + encrypted;

// Formato almacenado: "iv:encrypted_password"
```

### Clave de Encriptación

Por defecto: `fuxa-thingsboard-key-32-chars!`

Puede cambiarse con variable de entorno:
```bash
export TB_ENCRYPTION_KEY="tu-clave-secreta-de-32-chars"
```

---

## 📊 Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                        FUXA Frontend                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Tag Selection│  │   Lab/Home   │  │    Scripts   │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          │ HTTP             │ WebSocket        │ HTTP
          │                  │                  │
┌─────────┼──────────────────┼──────────────────┼─────────────┐
│         ▼                  ▼                  ▼              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ TB API       │  │   Runtime    │  │   Devices    │      │
│  │ Endpoints    │  │   Polling    │  │   getTag()   │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┼──────────────────┘              │
│                            ▼                                 │
│                   ┌─────────────────┐                        │
│                   │ TB Manager      │                        │
│                   │ - getDevices()  │                        │
│                   │ - getTelemetry()│                        │
│                   └────────┬────────┘                        │
│                            │                                 │
│                   ┌────────┴────────┐                        │
│                   │                 │                        │
│          ┌────────▼────────┐ ┌─────▼──────┐                 │
│          │   TB Config     │ │ TB Client  │                 │
│          │ - credentials   │ │ - HTTP API │                 │
│          │ - encryption    │ │ - auth JWT │                 │
│          └─────────────────┘ └─────┬──────┘                 │
│                                     │                        │
│                        FUXA Backend │                        │
└─────────────────────────────────────┼────────────────────────┘
                                      │
                                      │ HTTP/REST
                                      │
                            ┌─────────▼──────────┐
                            │   ThingsBoard      │
                            │   - Devices        │
                            │   - Telemetry      │
                            │   - Authentication │
                            └────────────────────┘
```

---

## 🎯 Características Clave

### ✅ Lo que SÍ hace:

1. **Consultas On-Demand:** Devices y telemetría se consultan cuando se necesitan
2. **Polling en Tiempo Real:** Valores se actualizan cada 1 segundo en Lab/Home
3. **Credenciales Encriptadas:** Contraseñas se guardan encriptadas
4. **Autenticación JWT:** Usa tokens JWT de ThingsBoard
5. **Refresh Automático:** Tokens se refrescan automáticamente
6. **Integración Transparente:** Scripts pueden usar tags de ThingsBoard sin cambios

### ❌ Lo que NO hace:

1. **NO almacena devices** de ThingsBoard en base de datos de FUXA
2. **NO almacena tags** de ThingsBoard localmente
3. **NO sincroniza** datos periódicamente
4. **NO usa WebSocket** de ThingsBoard (usa polling HTTP)
5. **NO cachea** valores de telemetría

---

## 🔄 Próximas Mejoras Posibles

1. **WebSocket Real-Time:** Usar WebSocket de ThingsBoard en lugar de polling
2. **Cache Inteligente:** Cachear valores por corto tiempo para reducir consultas
3. **Batch Queries:** Agrupar múltiples consultas en una sola
4. **Configuración UI:** Interfaz gráfica para configurar credenciales
5. **Multi-Tenant:** Soporte para múltiples cuentas de ThingsBoard
