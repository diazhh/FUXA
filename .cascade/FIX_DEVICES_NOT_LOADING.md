# Fix: ThingsBoard Devices Not Loading in Tag Selection

## 🐛 Problema Identificado

### Síntomas:
- ✅ Logs muestran: "retrieved 17 devices from ThingsBoard"
- ✅ Logs muestran: "17 devices after filtering"
- ❌ Tag Selection está vacío (0 of 0)
- ❌ No aparecen logs de "added device"
- ❌ No aparece log de "synced X devices"

### Causa Raíz:

**Los devices se sincronizan pero nunca se cargan en el Device Manager**

1. `syncDevices()` obtiene los devices de ThingsBoard ✅
2. `addDevice()` se llama para cada device
3. **Pero `addDevice()` falla silenciosamente** ❌
4. Los devices se guardan en `sync.devices` pero nunca llegan al Device Manager
5. `devices.load()` se ejecuta ANTES de que la sincronización termine

**Secuencia del problema:**
```
1. FUXA init → devices.load() se ejecuta
2. ThingsBoard aún no ha sincronizado (async)
3. devices.load() obtiene 0 devices de ThingsBoard
4. Más tarde: ThingsBoard sincroniza 17 devices
5. Pero devices.load() ya se ejecutó y no se vuelve a llamar
6. Los devices quedan en memoria pero no en el Device Manager
```

## ✅ Solución Implementada

### Fix 1: Event-Driven Device Loading

**Problema:** `devices.load()` se ejecuta antes de que ThingsBoard sincronice

**Solución:** Escuchar el evento 'devices-synced' y recargar devices

**Archivo:** `/server/runtime/index.js`

**Cambios:**

1. **Recargar devices después del auto-start** (líneas 85-87):
```javascript
thingsBoardMgr.start().then(() => {
    logger.info('runtime.thingsboard-auto-started', true);
    // Reload devices after ThingsBoard sync completes
    devices.load();
}).catch(err => {
    logger.error(`runtime.failed-to-auto-start-thingsboard: ${err.message}`);
});
```

2. **Escuchar eventos de sincronización** (líneas 103-109):
```javascript
// Listen for ThingsBoard device sync events
if (thingsBoardMgr) {
    thingsBoardMgr.on('devices-synced', () => {
        logger.info('runtime: ThingsBoard devices synced, reloading device manager...', true);
        devices.load();
    });
}
```

### Fix 2: ThingsBoardManager como EventEmitter

**Problema:** ThingsBoardManager no puede emitir eventos

**Solución:** Heredar de EventEmitter y propagar eventos del Sync

**Archivo:** `/server/runtime/thingsboard/index.js`

**Cambios:**

1. **Import EventEmitter** (línea 8):
```javascript
const EventEmitter = require('events');
```

2. **Heredar de EventEmitter** (línea 13):
```javascript
class ThingsBoardManager extends EventEmitter {
    constructor(settings, logger) {
        super();  // Llamar constructor de EventEmitter
        ...
    }
}
```

3. **Propagar eventos del Sync** (líneas 56-65):
```javascript
this.sync = new ThingsBoardSync(this.client, tbConfig, this.logger);

// Propagate sync events
this.sync.on('devices-synced', (devices) => {
    this.emit('devices-synced', devices);
});
this.sync.on('device-added', (device) => {
    this.emit('device-added', device);
});
this.sync.on('device-removed', (deviceId) => {
    this.emit('device-removed', deviceId);
});
```

### Fix 3: Logging Detallado en addDevice

**Problema:** `addDevice()` falla silenciosamente sin logs

**Solución:** Agregar logging detallado en cada paso

**Archivo:** `/server/runtime/thingsboard/tb-sync.js`

**Cambios (líneas 184-211):**
```javascript
async addDevice(tbDevice) {
    try {
        const deviceId = tbDevice.id.id;
        this.logger.info(`thingsboard-sync: adding device '${tbDevice.name}' (${deviceId})...`);
        
        this.logger.info(`thingsboard-sync: fetching telemetry keys for '${tbDevice.name}'...`);
        const telemetryKeys = await this.client.getTelemetryKeys(deviceId);
        this.logger.info(`thingsboard-sync: got ${telemetryKeys ? telemetryKeys.length : 0} telemetry keys`);
        
        this.logger.info(`thingsboard-sync: fetching latest telemetry for '${tbDevice.name}'...`);
        const latestTelemetry = await this.client.getLatestTelemetry(deviceId);
        this.logger.info(`thingsboard-sync: got telemetry: ${JSON.stringify(Object.keys(latestTelemetry || {}))}`);
        
        this.logger.info(`thingsboard-sync: mapping device '${tbDevice.name}' to FUXA format...`);
        const fuxaDevice = this.mapThingsBoardDeviceToFuxa(tbDevice, telemetryKeys, latestTelemetry);
        this.logger.info(`thingsboard-sync: mapped device has ${Object.keys(fuxaDevice.tags || {}).length} tags`);
        
        this.devices.set(deviceId, fuxaDevice);
        this.telemetryCache.set(deviceId, latestTelemetry);
        
        this.emit('device-added', fuxaDevice);
        this.logger.info(`thingsboard-sync: added device '${tbDevice.name}'`, true);
    } catch (err) {
        this.logger.error(`thingsboard-sync: failed to add device '${tbDevice.name}'! ${err.message}`);
        if (err.stack) {
            this.logger.error(`thingsboard-sync: stack: ${err.stack}`);
        }
    }
}
```

## 🔄 Flujo Corregido

### ANTES (Incorrecto):
```
1. FUXA init
2. devices.load() → 0 devices TB (aún no sincronizado)
3. ThingsBoard init (async)
4. ThingsBoard start (async)
5. ThingsBoard sync → 17 devices
6. Devices quedan en memoria pero no en Device Manager ❌
```

### DESPUÉS (Correcto):
```
1. FUXA init
2. devices.load() → 0 devices TB (aún no sincronizado)
3. ThingsBoard init (async)
4. ThingsBoard start (async)
5. ThingsBoard sync → 17 devices
6. Emit 'devices-synced' event ✅
7. Runtime escucha evento ✅
8. devices.load() se ejecuta de nuevo ✅
9. Devices TB se cargan en Device Manager ✅
10. Tags disponibles en Tag Selection ✅
```

## 🧪 Logs Esperados Después del Fix

### Secuencia Completa:
```
[INF] FUXA V.1.2.7-2525
[INF] thingsboard-client: authenticating with 192.168.31.113...
[INF] FUXA init in XXXms.
[INF] FUXA started!
[INF] thingsboard-sync: syncing devices...
[INF] thingsboard-client: fetching devices from http://192.168.31.113:8081/api/tenant/devices
[INF] thingsboard-client: response status 200
[INF] thingsboard-sync: retrieved 17 devices from ThingsBoard
[INF] thingsboard-sync: 17 devices after filtering

# Para cada device:
[INF] thingsboard-sync: adding device 'test01' (abc123...)...
[INF] thingsboard-sync: fetching telemetry keys for 'test01'...
[INF] thingsboard-sync: got 5 telemetry keys
[INF] thingsboard-sync: fetching latest telemetry for 'test01'...
[INF] thingsboard-sync: got telemetry: ["temperature","humidity",...]
[INF] thingsboard-sync: mapping device 'test01' to FUXA format...
[INF] thingsboard-sync: mapped device has 5 tags
[INF] thingsboard-sync: added device 'test01'

# Después de todos los devices:
[INF] thingsboard-sync: synced 17 devices
[INF] runtime: ThingsBoard devices synced, reloading device manager...
[INF] devices.load: loaded 17 ThingsBoard devices
[INF] runtime.thingsboard-auto-started
```

## 📊 Verificación

### 1. Reiniciar FUXA
```bash
cd /home/jsalazar-fcore/FUXA/server
npm start
```

### 2. Verificar Logs
Buscar en orden:
- [ ] "retrieved 17 devices from ThingsBoard"
- [ ] "adding device 'XXX'..." (para cada device)
- [ ] "got X telemetry keys" (para cada device)
- [ ] "mapped device has X tags" (para cada device)
- [ ] "added device 'XXX'" (para cada device)
- [ ] "synced 17 devices"
- [ ] "ThingsBoard devices synced, reloading device manager..."
- [ ] "devices.load: loaded 17 ThingsBoard devices"

### 3. Verificar API
```bash
curl http://localhost:1881/api/thingsboard/devices | jq '. | length'
# Debería retornar: 17

curl http://localhost:1881/api/thingsboard/devices | jq '.[0].tags | keys'
# Debería mostrar las telemetry keys como tags
```

### 4. Verificar UI
1. Abrir http://localhost:1881
2. Ir a Editor
3. Agregar un elemento (ej: Text)
4. Click en "Tag Selection"
5. **Deberías ver los devices de ThingsBoard con sus tags**

## 📝 Archivos Modificados

1. `/server/runtime/index.js`
   - Líneas 85-87: Reload devices después de start
   - Líneas 103-109: Event listener para devices-synced

2. `/server/runtime/thingsboard/index.js`
   - Línea 8: Import EventEmitter
   - Línea 13: Heredar de EventEmitter
   - Líneas 56-65: Propagar eventos del Sync

3. `/server/runtime/thingsboard/tb-sync.js`
   - Líneas 184-211: Logging detallado en addDevice

## 🎯 Resultado Esperado

Después de reiniciar FUXA:

✅ Tag Selection muestra devices de ThingsBoard  
✅ Cada device tiene sus telemetry keys como tags  
✅ Los tags se pueden seleccionar y usar en el editor  
✅ Los valores se actualizan en tiempo real  

---

**ACCIÓN REQUERIDA:** Reiniciar FUXA y verificar que los tags aparezcan en Tag Selection.
