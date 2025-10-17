# ThingsBoard Driver - Quick Reference

## Cambios Mínimos Requeridos

### 1. Backend: device.js (4 cambios)

```javascript
// CAMBIO 1: Línea ~19 - Agregar import
var ThingsBoardClient = require('./thingsboard');

// CAMBIO 2: Línea ~116 - Agregar en constructor
} else if (data.type === DeviceEnum.ThingsBoard) {
    if (!ThingsBoardClient) {
        return null;
    }
    comm = ThingsBoardClient.create(data, logger, events, manager, runtime);
}

// CAMBIO 3: Línea ~305 - Agregar en browse
} else if (data.type === DeviceEnum.ThingsBoard) {
    comm.browse(path, callback).then(function (result) {
        resolve(result);
    }).catch(function (err) {
        reject(err);
    });
}

// CAMBIO 4: Línea ~573 - Agregar a enum
var DeviceEnum = {
    // ... otros
    ThingsBoard: 'ThingsBoard'
}
```

### 2. Frontend: device.ts (1 cambio)

```typescript
// CAMBIO 1: Línea ~248 - Agregar a enum
export enum DeviceType {
    // ... otros
    ThingsBoard = 'ThingsBoard'
}
```

## Configuración Rápida

### Ejemplo de Dispositivo

```json
{
  "id": "d_tb_001",
  "name": "My ThingsBoard",
  "type": "ThingsBoard",
  "enabled": true,
  "polling": 5000,
  "property": {
    "serverUrl": "http://demo.thingsboard.io",
    "username": "tenant@thingsboard.org",
    "password": "tenant",
    "useMqtt": true
  },
  "tags": {}
}
```

### Ejemplo de Tag

```json
{
  "id": "t_temp_001",
  "name": "Temperature",
  "address": "device-id-here:temperature",
  "type": "Real",
  "divisor": 1,
  "format": 2,
  "options": {
    "writeType": "attribute"
  }
}
```

## Formato de Address

```
deviceId:telemetryKey
```

Ejemplos:
- `a1b2c3d4-5678-90ab-cdef-1234567890ab:temperature`
- `sensor-001:humidity`
- `device123:pressure`

## Tipos de Escritura

### Atributo Compartido (Default)
```json
{
  "options": {
    "writeType": "attribute"
  }
}
```

### Comando RPC
```json
{
  "options": {
    "writeType": "rpc",
    "rpcMethod": "setValue"
  }
}
```

## API REST Endpoints

```javascript
// Login
POST /api/auth/login
Body: { username, password }

// Get Devices
GET /api/tenant/devices?pageSize=100&page=0

// Get Telemetry Keys
GET /api/plugins/telemetry/DEVICE/{deviceId}/keys/timeseries

// Get Latest Telemetry
GET /api/plugins/telemetry/DEVICE/{deviceId}/values/timeseries?keys=temp,humidity

// Write Attribute
POST /api/plugins/telemetry/DEVICE/{deviceId}/attributes/SHARED_SCOPE
Body: { "key": "value" }

// Send RPC
POST /api/plugins/rpc/twoway/{deviceId}
Body: { method: "setValue", params: {}, timeout: 5000 }
```

## MQTT Topics

```javascript
// Gateway Telemetry (Subscribe)
v1/gateway/telemetry

// Payload Format
{
  "deviceName": [{
    "ts": 1234567890,
    "values": {
      "temperature": 25.5,
      "humidity": 60
    }
  }]
}
```

## Testing Rápido

### Test 1: Conexión
```bash
curl -X POST http://demo.thingsboard.io/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"tenant@thingsboard.org","password":"tenant"}'
```

### Test 2: Listar Dispositivos
```bash
curl -X GET http://demo.thingsboard.io/api/tenant/devices \
  -H "X-Authorization: Bearer YOUR_TOKEN"
```

### Test 3: Leer Telemetría
```bash
curl -X GET "http://demo.thingsboard.io/api/plugins/telemetry/DEVICE/DEVICE_ID/values/timeseries?keys=temperature" \
  -H "X-Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

### Error: "Login failed"
✓ Verificar URL (incluir http:// o https://)
✓ Verificar credenciales
✓ Verificar conectividad

### Error: "MQTT connection failed"
✓ Puerto MQTT: 1883 (mqtt) o 8883 (mqtts)
✓ Verificar firewall
✓ Probar sin MQTT: useMqtt: false

### No se actualizan valores
✓ Verificar formato de address: deviceId:key
✓ Verificar polling interval
✓ Revisar logs del servidor

### Valores incorrectos
✓ Verificar tipo de tag (Bool, Real, etc.)
✓ Verificar divisor
✓ Verificar formato (decimales)

## Comandos de Desarrollo

```bash
# Reiniciar servidor
cd server && npm start

# Compilar frontend
cd client && npm run build

# Ver logs
tail -f server/logs/fuxa.log | grep ThingsBoard

# Test backend
cd server && npm test
```

## Estructura de Archivos

```
server/runtime/devices/
├── device.js                    ← MODIFICAR
├── thingsboard/                 ← YA EXISTE
│   ├── index.js
│   ├── tb-rest-client.js
│   ├── tb-mqtt-client.js
│   └── tb-device-mapper.js

client/src/app/_models/
└── device.ts                    ← MODIFICAR

client/src/app/device/
├── device-property/
│   └── device-property-thingsboard/  ← CREAR
└── tag-property/
    └── tag-property-edit-thingsboard/ ← YA EXISTE
```

## Dependencias

Ya incluidas en package.json:
- ✅ axios (REST API)
- ✅ mqtt (MQTT client)

No se requieren dependencias adicionales.

## Próximos Pasos

1. ✅ Analizar código existente
2. ⚠️ Modificar device.js (backend)
3. ⚠️ Modificar device.ts (frontend)
4. 📋 Crear componente de propiedades
5. 📋 Registrar componentes en módulo
6. 📋 Testing
7. 📋 Documentación de usuario

## Referencias Rápidas

- ThingsBoard Demo: http://demo.thingsboard.io
- Usuario: tenant@thingsboard.org
- Password: tenant
- API Docs: https://thingsboard.io/docs/reference/rest-api/
- MQTT Docs: https://thingsboard.io/docs/reference/mqtt-api/

---

**Versión**: 1.0  
**Fecha**: 2025-10-07
