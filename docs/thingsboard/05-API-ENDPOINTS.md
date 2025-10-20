# API REST - ThingsBoard Integration

## 🌐 Endpoints Disponibles

Todos los endpoints requieren autenticación de FUXA mediante token JWT.

**Base URL:** `http://localhost:1881/api/thingsboard`

---

## 📋 Lista de Endpoints

### 1. GET /api/thingsboard/config

Obtiene la configuración actual de ThingsBoard (sin contraseña).

**Autenticación:** Requerida

**Respuesta:**
```json
{
  "enabled": true,
  "host": "192.168.31.113",
  "port": 8081,
  "protocol": "http",
  "username": "tenant@thingsboard.org",
  "syncInterval": 30000,
  "useWebSocket": true,
  "reconnectInterval": 5000,
  "maxReconnectAttempts": 10,
  "requestTimeout": 10000
}
```

**Ejemplo:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:1881/api/thingsboard/config
```

---

### 2. POST /api/thingsboard/config

Actualiza la configuración de ThingsBoard.

**Autenticación:** Requerida

**Body:**
```json
{
  "host": "nuevo-servidor.com",
  "port": 443,
  "protocol": "https",
  "username": "nuevo-usuario@thingsboard.org",
  "password": "nueva-contraseña"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Configuration updated successfully"
}
```

**Ejemplo:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"host":"192.168.31.113","username":"tenant@thingsboard.org"}' \
  http://localhost:1881/api/thingsboard/config
```

**Nota:** La configuración se guarda y el cliente se reinicia automáticamente.

---

### 3. GET /api/thingsboard/status

Obtiene el estado de la conexión con ThingsBoard.

**Autenticación:** Requerida

**Respuesta:**
```json
{
  "initialized": true,
  "enabled": true,
  "client": {
    "connected": true,
    "authenticated": true
  }
}
```

**Estados Posibles:**

| Estado | Descripción |
|--------|-------------|
| `initialized: false` | Integración no inicializada |
| `enabled: false` | Integración deshabilitada en config |
| `connected: false` | No conectado a ThingsBoard |
| `authenticated: false` | No autenticado (sin token) |

**Ejemplo:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:1881/api/thingsboard/status
```

---

### 4. GET /api/thingsboard/devices

Obtiene la lista de devices de ThingsBoard.

**Autenticación:** Requerida

**Query Parameters:** Ninguno

**Respuesta:**
```json
[
  {
    "id": {
      "id": "622b4ba0-a850-11f0-aabd-5b2d2a47a78c",
      "entityType": "DEVICE"
    },
    "createdTime": 1634567890000,
    "name": "TB:test07",
    "type": "default",
    "label": "Test Device",
    "customerId": {...},
    "additionalInfo": {...}
  },
  ...
]
```

**Ejemplo:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:1881/api/thingsboard/devices
```

**Nota:** Esta consulta se hace on-demand a ThingsBoard, NO lee de base de datos local.

---

### 5. GET /api/thingsboard/device/:id

Obtiene información de un device específico.

**Autenticación:** Requerida

**Path Parameters:**
- `id` - ID del device en ThingsBoard

**Respuesta:**
```json
{
  "id": {
    "id": "622b4ba0-a850-11f0-aabd-5b2d2a47a78c",
    "entityType": "DEVICE"
  },
  "createdTime": 1634567890000,
  "name": "TB:test07",
  "type": "default",
  "label": "Test Device",
  "customerId": {...},
  "additionalInfo": {...}
}
```

**Ejemplo:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:1881/api/thingsboard/device/622b4ba0-a850-11f0-aabd-5b2d2a47a78c
```

---

### 6. GET /api/thingsboard/device/:id/keys

Obtiene las claves de telemetría disponibles para un device.

**Autenticación:** Requerida

**Path Parameters:**
- `id` - ID del device en ThingsBoard

**Respuesta:**
```json
[
  "temperatura",
  "humedad",
  "presion",
  "nivel"
]
```

**Ejemplo:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:1881/api/thingsboard/device/622b4ba0-a850-11f0-aabd-5b2d2a47a78c/keys
```

**Nota:** Estas son las claves que se muestran como "tags" en Tag Selection.

---

### 7. GET /api/thingsboard/device/:id/telemetry

Obtiene los valores actuales de telemetría de un device.

**Autenticación:** Requerida

**Path Parameters:**
- `id` - ID del device en ThingsBoard

**Query Parameters:**
- `keys` (opcional) - Claves separadas por coma. Si no se especifica, retorna todas.

**Respuesta:**
```json
{
  "temperatura": [
    {
      "ts": 1634567890000,
      "value": "25.3"
    }
  ],
  "humedad": [
    {
      "ts": 1634567890000,
      "value": "65.8"
    }
  ]
}
```

**Ejemplo (todas las claves):**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:1881/api/thingsboard/device/622b4ba0-a850-11f0-aabd-5b2d2a47a78c/telemetry
```

**Ejemplo (claves específicas):**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:1881/api/thingsboard/device/622b4ba0-a850-11f0-aabd-5b2d2a47a78c/telemetry?keys=temperatura,humedad"
```

---

### 8. POST /api/thingsboard/test

Prueba la conexión con ThingsBoard usando credenciales específicas.

**Autenticación:** Requerida

**Body:**
```json
{
  "host": "192.168.31.113",
  "port": 8081,
  "protocol": "http",
  "username": "tenant@thingsboard.org",
  "password": "tenant"
}
```

**Respuesta (Éxito):**
```json
{
  "success": true,
  "message": "Connection successful",
  "connected": true
}
```

**Respuesta (Error):**
```json
{
  "success": false,
  "message": "Authentication failed: Invalid username or password",
  "connected": false
}
```

**Ejemplo:**
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "host": "192.168.31.113",
    "port": 8081,
    "protocol": "http",
    "username": "tenant@thingsboard.org",
    "password": "tenant"
  }' \
  http://localhost:1881/api/thingsboard/test
```

**Nota:** Útil para validar credenciales antes de guardarlas.

---

## 🔐 Autenticación

Todos los endpoints requieren un token JWT de FUXA en el header `Authorization`.

### Obtener Token

```bash
# Login en FUXA
curl -X POST http://localhost:1881/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
```

**Respuesta:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {...}
}
```

### Usar Token

```bash
curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  http://localhost:1881/api/thingsboard/status
```

---

## ❌ Códigos de Error

| Código | Descripción |
|--------|-------------|
| 200 | OK - Operación exitosa |
| 400 | Bad Request - Datos inválidos |
| 401 | Unauthorized - Token inválido o faltante |
| 403 | Forbidden - Token expirado |
| 404 | Not Found - Recurso no encontrado |
| 500 | Internal Server Error - Error del servidor |
| 503 | Service Unavailable - ThingsBoard no disponible |

### Ejemplos de Errores

**401 Unauthorized:**
```json
{
  "error": "unauthorized_error",
  "message": "Unauthorized!"
}
```

**503 Service Unavailable:**
```json
{
  "error": "service_unavailable",
  "message": "ThingsBoard integration not initialized"
}
```

**500 Internal Server Error:**
```json
{
  "error": "server_error",
  "message": "Authentication failed: Connection timeout"
}
```

---

## 📊 Ejemplos de Uso

### Flujo Completo: Configurar y Usar ThingsBoard

```bash
# 1. Login en FUXA
TOKEN=$(curl -s -X POST http://localhost:1881/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' \
  | jq -r '.token')

# 2. Verificar estado actual
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:1881/api/thingsboard/status

# 3. Actualizar configuración
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "host": "192.168.31.113",
    "port": 8081,
    "protocol": "http",
    "username": "tenant@thingsboard.org",
    "password": "tenant",
    "enabled": true
  }' \
  http://localhost:1881/api/thingsboard/config

# 4. Verificar conexión
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:1881/api/thingsboard/status

# 5. Listar devices
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:1881/api/thingsboard/devices \
  | jq '.[].name'

# 6. Obtener device específico
DEVICE_ID="622b4ba0-a850-11f0-aabd-5b2d2a47a78c"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:1881/api/thingsboard/device/$DEVICE_ID

# 7. Obtener claves de telemetría
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:1881/api/thingsboard/device/$DEVICE_ID/keys

# 8. Obtener valores actuales
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:1881/api/thingsboard/device/$DEVICE_ID/telemetry?keys=temperatura,humedad"
```

---

## 🔧 Integración con Frontend

### Ejemplo en JavaScript

```javascript
// Obtener devices
async function getThingsBoardDevices() {
  const response = await fetch('/api/thingsboard/devices', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch devices');
  }
  
  return await response.json();
}

// Obtener telemetría
async function getTelemetry(deviceId, keys) {
  const url = `/api/thingsboard/device/${deviceId}/telemetry?keys=${keys.join(',')}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch telemetry');
  }
  
  return await response.json();
}

// Usar
const devices = await getThingsBoardDevices();
const telemetry = await getTelemetry('622b4ba0-a850-11f0-aabd-5b2d2a47a78c', ['temperatura', 'humedad']);
```

---

## 📝 Notas Importantes

### 1. Consultas On-Demand

Todos los endpoints de devices y telemetría consultan ThingsBoard en tiempo real. **NO** leen de base de datos local.

### 2. Caché

Actualmente **NO** hay caché. Cada petición hace una consulta HTTP a ThingsBoard.

### 3. Rate Limiting

No hay rate limiting implementado. Ten cuidado de no sobrecargar ThingsBoard con muchas peticiones.

### 4. Timeout

Las peticiones tienen un timeout de 10 segundos (configurable en `requestTimeout`).

### 5. Autenticación Automática

Si el token JWT de ThingsBoard expira, el cliente intenta refrescarlo automáticamente.

---

## 📚 Referencias

- **Código de API:** `/server/api/thingsboard/index.js`
- **Código de Manager:** `/server/runtime/thingsboard/index.js`
- **Código de Cliente:** `/server/runtime/thingsboard/tb-client.js`
