# 📋 Plan de Implementación Detallado - Auto-inicio ThingsBoard

## 🎯 Objetivo
Implementar auto-conexión y auto-descubrimiento de ThingsBoard al arranque de FUXA

---

## 📦 Fase 1: Persistencia de Tags Auto-descubiertos

### ✅ Paso 1.1: Agregar listener para `device-tags-update`

**Archivo:** `/server/runtime/devices/index.js`

**Ubicación:** Después de la línea 75 (después de `devices.init(runtime);`)

**Código a agregar:**
```javascript
// Listen for auto-discovered tags from ThingsBoard
runtime.events.on('device-tags-update', handleDeviceTagsUpdate);
```

**Ubicación:** Al final del archivo, antes de `module.exports`

**Código a agregar:**
```javascript
/**
 * Handle auto-discovered tags from devices (e.g., ThingsBoard)
 * Persist the tags to the database
 * @param {*} event { deviceId, tags }
 */
function handleDeviceTagsUpdate(event) {
    try {
        const { deviceId, tags } = event;
        
        if (!deviceId || !tags) {
            runtime.logger.warn('Invalid device-tags-update event: missing deviceId or tags');
            return;
        }
        
        // Get current device from project
        let device = null;
        const devices = runtime.project.getDevices();
        for (const id in devices) {
            if (devices[id].id === deviceId) {
                device = devices[id];
                break;
            }
        }
        
        if (!device) {
            runtime.logger.warn(`Device ${deviceId} not found for tags update`);
            return;
        }
        
        // Count new tags
        const existingTagCount = Object.keys(device.tags || {}).length;
        const newTagCount = Object.keys(tags).length;
        
        // Update tags (merge with existing)
        device.tags = { ...device.tags, ...tags };
        
        // Persist to database
        const ProjectDataCmdType = runtime.project.ProjectDataCmdType;
        runtime.project.setProjectData(ProjectDataCmdType.SetDevice, device)
            .then(() => {
                const addedTags = newTagCount - existingTagCount;
                runtime.logger.info(
                    `Auto-discovered tags saved for device '${device.name}': ` +
                    `${addedTags} new tags (${newTagCount} total)`, 
                    true
                );
            })
            .catch(err => {
                runtime.logger.error(`Failed to save auto-discovered tags for '${device.name}': ${err}`);
            });
        
    } catch (err) {
        runtime.logger.error(`Error handling device-tags-update: ${err}`);
    }
}
```

---

### ✅ Paso 1.2: Evitar duplicación de tags

**Archivo:** `/server/runtime/devices/thingsboard/index.js`

**Ubicación:** Función `_discoverDevices` (línea 428-481)

**Reemplazar la función completa con:**
```javascript
/**
 * Discover ThingsBoard devices and create tags automatically
 */
var _discoverDevices = async function () {
    try {
        logger.info(`'${data.name}' discovering ThingsBoard devices...`, true);
        
        // Count existing tags before discovery
        const existingTagCount = Object.keys(data.tags).length;
        
        // Get all devices from ThingsBoard
        const devices = await restClient.getDevices(100, 0);
        logger.info(`'${data.name}' found ${devices.length} ThingsBoard devices`, true);
        
        // Track statistics
        let devicesProcessed = 0;
        let tagsCreated = 0;
        let tagsSkipped = 0;
        
        // Create tags for each device
        for (const device of devices) {
            const deviceId = device.id.id;
            const deviceName = device.name;
            
            try {
                // Get telemetry keys for this device
                const telemetryKeys = await restClient.getTelemetryKeys(deviceId);
                
                if (telemetryKeys.length > 0) {
                    logger.info(
                        `'${data.name}' device '${deviceName}' has ${telemetryKeys.length} telemetry keys`, 
                        true
                    );
                    
                    // Create a tag for each telemetry key
                    for (const key of telemetryKeys) {
                        const tagId = `${deviceId}_${key}`;
                        const tagName = `${deviceName}.${key}`;
                        
                        // Check if tag already exists
                        if (!data.tags[tagId]) {
                            data.tags[tagId] = {
                                id: tagId,
                                name: tagName,
                                address: `${deviceId}:${key}`,
                                type: 'number', // Default type
                                device: data.id,
                                memaddress: `${deviceId}:${key}`,
                                divisor: 1,
                                daq: {}
                            };
                            tagsCreated++;
                        } else {
                            tagsSkipped++;
                        }
                    }
                    
                    devicesProcessed++;
                }
            } catch (err) {
                logger.error(`'${data.name}' error processing device '${deviceName}': ${err}`);
            }
        }
        
        // Calculate new tags
        const currentTagCount = Object.keys(data.tags).length;
        const newTagsCount = currentTagCount - existingTagCount;
        
        // Log summary
        logger.info(
            `'${data.name}' discovery complete: ` +
            `${devicesProcessed} devices processed, ` +
            `${tagsCreated} tags created, ` +
            `${tagsSkipped} tags skipped (already exist)`,
            true
        );
        
        // Only emit event if we created NEW tags
        if (newTagsCount > 0) {
            logger.info(`'${data.name}' emitting device-tags-update event with ${newTagsCount} new tags`, true);
            events.emit('device-tags-update', { deviceId: data.id, tags: data.tags });
        } else {
            logger.info(`'${data.name}' no new tags to persist (${existingTagCount} tags already exist)`, true);
        }
        
    } catch (err) {
        logger.error(`'${data.name}' device discovery error: ${err}`);
        throw err;
    }
}
```

---

## 📦 Fase 2: Configuración de Auto-descubrimiento

### ✅ Paso 2.1: Agregar flag `autoDiscover` al modelo

**Archivo:** `/client/src/app/_models/device.ts`

**Ubicación:** Interface `ThingsBoardProperty` (buscar "export interface ThingsBoardProperty")

**Modificar:**
```typescript
export interface ThingsBoardProperty {
    serverUrl: string;
    username: string;
    password: string;
    useMqtt?: boolean;
    autoDiscover?: boolean;  // Auto-discover devices and create tags on connect
}
```

---

### ✅ Paso 2.2: Actualizar UI con checkbox

**Archivo:** `/client/src/app/device/device-property/device-property.component.html`

**Ubicación:** Buscar la sección de ThingsBoard (buscar "data.type === 'ThingsBoard'")

**Agregar después del checkbox de useMqtt:**
```html
<div class="my-form-field">
    <mat-checkbox [(ngModel)]="data.property.autoDiscover" 
                  name="autoDiscover"
                  [disabled]="readonly">
        Auto-discover devices on connect
    </mat-checkbox>
    <div class="help-text">
        Automatically discover all ThingsBoard devices and create tags for their telemetry when connecting
    </div>
</div>
```

---

### ✅ Paso 2.3: Usar flag en el driver

**Archivo:** `/server/runtime/devices/thingsboard/index.js`

**Ubicación 1:** Variables globales (después de línea 41)

**Agregar:**
```javascript
var autoDiscover = true;                    // Auto-discover devices on connect
```

**Ubicación 2:** Función `load()` (línea 191-238)

**Modificar la sección de configuración:**
```javascript
// Extract configuration
if (data.property) {
    serverUrl = data.property.serverUrl || data.property.address || '';
    username = data.property.username || '';
    password = data.property.password || '';
    useMqtt = data.property.useMqtt !== false; // Default true
    autoDiscover = data.property.autoDiscover !== false; // Default true - NUEVO
    
    // ... resto del código ...
    
    // DEBUG: Log final configuration
    logger.info(`'${data.name}' ThingsBoard config loaded:`, true);
    logger.info(`  Final serverUrl: '${serverUrl}'`, true);
    logger.info(`  Final username: '${username}'`, true);
    logger.info(`  Final password: ${password ? '***' : '(empty)'}`, true);
    logger.info(`  Final useMqtt: ${useMqtt}`, true);
    logger.info(`  Final autoDiscover: ${autoDiscover}`, true); // NUEVO
}
```

**Ubicación 3:** Función `connect()` (línea 57-108)

**Modificar la sección de descubrimiento:**
```javascript
// Discover ThingsBoard devices and create tags
if (autoDiscover) {
    logger.info(`'${data.name}' starting device discovery...`, true);
    await _discoverDevices();
    logger.info(`'${data.name}' device discovery completed`, true);
} else {
    logger.info(`'${data.name}' auto-discovery disabled, skipping device discovery`, true);
}
```

---

## 📦 Fase 3: Auto-inicio con Configuración

### ✅ Paso 3.1: Crear archivo de configuración de ejemplo

**Archivo:** `/server/_appdata/thingsboard-config.example.json` (nuevo)

**Contenido:**
```json
{
  "version": "1.0",
  "description": "ThingsBoard auto-configuration for FUXA startup",
  "devices": [
    {
      "name": "ThingsBoard Local",
      "enabled": true,
      "polling": 5000,
      "property": {
        "serverUrl": "http://localhost:8080",
        "username": "tenant@thingsboard.org",
        "password": "tenant",
        "useMqtt": false,
        "autoDiscover": true
      }
    },
    {
      "name": "ThingsBoard Production",
      "enabled": false,
      "polling": 10000,
      "property": {
        "serverUrl": "https://thingsboard.example.com",
        "username": "your-username@example.com",
        "password": "your-password",
        "useMqtt": true,
        "autoDiscover": true
      }
    }
  ]
}
```

**Instrucciones:**
1. Copiar este archivo a `thingsboard-config.json` (sin `.example`)
2. Modificar las credenciales según tu instalación
3. Habilitar los dispositivos que quieras usar (`enabled: true`)

---

### ✅ Paso 3.2: Implementar carga de configuración

**Archivo:** `/server/runtime/project/index.js`

**Ubicación 1:** Después de la función `_mergeDefaultConfig` (alrededor de línea 1000)

**Agregar nueva función:**
```javascript
/**
 * Load ThingsBoard devices from configuration file
 * This allows FUXA to start with pre-configured ThingsBoard connections
 */
async function _loadThingsBoardConfig() {
    try {
        const configPath = path.join(settings.workDir, 'thingsboard-config.json');
        
        // Check if config file exists
        if (!fs.existsSync(configPath)) {
            logger.info('No ThingsBoard config file found (thingsboard-config.json), skipping auto-configuration');
            return;
        }
        
        // Read and parse config file
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        if (!configData.devices || !Array.isArray(configData.devices)) {
            logger.warn('ThingsBoard config file has invalid format: missing or invalid "devices" array');
            return;
        }
        
        if (configData.devices.length === 0) {
            logger.info('ThingsBoard config file is empty (no devices configured)');
            return;
        }
        
        logger.info(`Loading ${configData.devices.length} ThingsBoard device(s) from config file`, true);
        
        let devicesCreated = 0;
        let devicesSkipped = 0;
        
        for (const deviceConfig of configData.devices) {
            try {
                // Validate device config
                if (!deviceConfig.name) {
                    logger.warn('Skipping ThingsBoard device with missing name');
                    devicesSkipped++;
                    continue;
                }
                
                if (!deviceConfig.property || !deviceConfig.property.serverUrl) {
                    logger.warn(`Skipping ThingsBoard device '${deviceConfig.name}': missing serverUrl`);
                    devicesSkipped++;
                    continue;
                }
                
                // Check if device already exists (by name and type)
                const existingDevice = Object.values(data.devices).find(d => 
                    d.name === deviceConfig.name && d.type === 'ThingsBoard'
                );
                
                if (existingDevice) {
                    logger.info(`ThingsBoard device '${deviceConfig.name}' already exists, skipping`);
                    devicesSkipped++;
                    continue;
                }
                
                // Generate unique ID
                const deviceId = utils.getShortGUID('d-');
                
                // Create device object
                const device = {
                    id: deviceId,
                    name: deviceConfig.name,
                    type: 'ThingsBoard',
                    enabled: deviceConfig.enabled !== false, // Default true
                    polling: deviceConfig.polling || 5000,
                    tags: {},
                    property: {
                        serverUrl: deviceConfig.property.serverUrl,
                        username: deviceConfig.property.username || '',
                        password: deviceConfig.property.password || '',
                        useMqtt: deviceConfig.property.useMqtt !== false, // Default true
                        autoDiscover: deviceConfig.property.autoDiscover !== false // Default true
                    }
                };
                
                // Add to local data
                setDevice(device);
                
                // Save to database
                await setProjectData(ProjectDataCmdType.SetDevice, device);
                
                logger.info(
                    `ThingsBoard device '${device.name}' created from config ` +
                    `(enabled: ${device.enabled}, autoDiscover: ${device.property.autoDiscover})`,
                    true
                );
                devicesCreated++;
                
            } catch (err) {
                logger.error(`Error creating ThingsBoard device '${deviceConfig.name}': ${err}`);
                devicesSkipped++;
            }
        }
        
        logger.info(
            `ThingsBoard config loaded: ${devicesCreated} devices created, ${devicesSkipped} skipped`,
            true
        );
        
    } catch (err) {
        logger.error(`Error loading ThingsBoard config: ${err}`);
    }
}
```

**Ubicación 2:** Función `load()` (alrededor de línea 147-154)

**Modificar la sección después de cargar devices:**
```javascript
async function (err) {
    if (err) {
        reject(err);
    } else {
        // NUEVO: Load ThingsBoard auto-configuration
        await _loadThingsBoardConfig();
        
        await _mergeDefaultConfig();
        resolve();
    }
});
```

---

## 📦 Fase 4: Mejoras Opcionales

### ✅ Paso 4.1: Comando para re-descubrimiento

**Archivo:** `/server/runtime/devices/index.js`

**Ubicación:** Al final del archivo, antes de `module.exports`

**Agregar:**
```javascript
/**
 * Force rediscovery of tags for a ThingsBoard device
 * Clears existing tags and reconnects to trigger discovery
 * @param {*} deviceName 
 */
function rediscoverDeviceTags(deviceName) {
    return new Promise((resolve, reject) => {
        try {
            // Get device
            const device = runtime.project.getDevice(deviceName);
            if (!device) {
                reject(`Device '${deviceName}' not found`);
                return;
            }
            
            if (device.type !== 'ThingsBoard') {
                reject(`Device '${deviceName}' is not a ThingsBoard device`);
                return;
            }
            
            if (!activeDevices[device.id]) {
                reject(`Device '${deviceName}' is not active`);
                return;
            }
            
            runtime.logger.info(`Triggering rediscovery for device '${deviceName}'`, true);
            
            // Clear existing tags
            device.tags = {};
            
            // Stop and restart device to trigger discovery
            activeDevices[device.id].stop()
                .then(() => {
                    // Wait a moment before restarting
                    setTimeout(() => {
                        activeDevices[device.id].start();
                        runtime.logger.info(`Rediscovery started for device '${deviceName}'`, true);
                        resolve();
                    }, 1000);
                })
                .catch(err => {
                    runtime.logger.error(`Error during rediscovery for '${deviceName}': ${err}`);
                    reject(err);
                });
            
        } catch (err) {
            runtime.logger.error(`Error rediscovering device: ${err}`);
            reject(err);
        }
    });
}
```

**Ubicación:** Agregar a exports

```javascript
var devices = module.exports = {
    // ... exports existentes ...
    rediscoverDeviceTags: rediscoverDeviceTags
}
```

---

## 🧪 Pruebas

### Test 1: Persistencia de Tags

```bash
# 1. Iniciar FUXA
cd /home/jsalazar/FUXA/server
npm start

# 2. Crear dispositivo ThingsBoard desde UI
# - Name: "Test TB"
# - Type: ThingsBoard
# - Enabled: true
# - ServerUrl: http://localhost:8080
# - Username: tenant@thingsboard.org
# - Password: tenant
# - AutoDiscover: true

# 3. Esperar a que se conecte y descubra tags

# 4. Verificar tags en BD
node -e "
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('_appdata/project.fuxap.db');
db.all('SELECT * FROM devices WHERE name LIKE \"%Test TB%\"', (err, rows) => {
    rows.forEach(row => {
        const device = JSON.parse(row.value);
        console.log('Device:', device.name);
        console.log('Tags:', Object.keys(device.tags).length);
    });
    db.close();
});
"

# 5. Reiniciar FUXA
# Ctrl+C
npm start

# 6. Verificar que tags siguen existiendo
# Ir a UI → Devices → Test TB → Tags
# ✅ Los tags deben estar presentes
```

### Test 2: Auto-inicio con Config

```bash
# 1. Crear archivo de configuración
cd /home/jsalazar/FUXA/server/_appdata
cat > thingsboard-config.json << 'EOF'
{
  "version": "1.0",
  "devices": [
    {
      "name": "Auto ThingsBoard",
      "enabled": true,
      "polling": 5000,
      "property": {
        "serverUrl": "http://localhost:8080",
        "username": "tenant@thingsboard.org",
        "password": "tenant",
        "useMqtt": false,
        "autoDiscover": true
      }
    }
  ]
}
EOF

# 2. Reiniciar FUXA
cd /home/jsalazar/FUXA/server
npm start

# 3. Verificar logs
# Buscar: "Loading 1 ThingsBoard device(s) from config file"
# Buscar: "ThingsBoard device 'Auto ThingsBoard' created from config"
# Buscar: "'Auto ThingsBoard' discovering ThingsBoard devices..."

# 4. Verificar en UI
# Ir a Devices
# ✅ Debe aparecer "Auto ThingsBoard"
# ✅ Debe estar conectado (verde)
# ✅ Debe tener tags auto-descubiertos
```

### Test 3: Flag AutoDiscover

```bash
# 1. Crear dispositivo con autoDiscover=false
# En UI:
# - Name: "Manual TB"
# - AutoDiscover: ❌ (desactivado)

# 2. Verificar logs
# Buscar: "'Manual TB' auto-discovery disabled, skipping device discovery"

# 3. Verificar tags
# ✅ No debe haber tags auto-creados

# 4. Cambiar a autoDiscover=true
# Editar dispositivo, activar checkbox

# 5. Reconectar
# Disable → Enable device

# 6. Verificar logs
# Buscar: "'Manual TB' starting device discovery..."

# 7. Verificar tags
# ✅ Ahora debe tener tags auto-descubiertos
```

---

## 📊 Checklist de Implementación

### Fase 1: Persistencia ⭐ CRÍTICO
- [ ] Paso 1.1: Agregar listener en `/server/runtime/devices/index.js`
- [ ] Paso 1.1: Implementar función `handleDeviceTagsUpdate()`
- [ ] Paso 1.2: Modificar `_discoverDevices()` en thingsboard driver
- [ ] Test 1: Verificar persistencia de tags

### Fase 2: Configuración ⭐ IMPORTANTE
- [ ] Paso 2.1: Agregar `autoDiscover` a interface TypeScript
- [ ] Paso 2.2: Agregar checkbox en UI
- [ ] Paso 2.3: Usar flag en driver (3 ubicaciones)
- [ ] Test 3: Verificar flag autoDiscover

### Fase 3: Auto-inicio 🎯 OBJETIVO
- [ ] Paso 3.1: Crear `thingsboard-config.example.json`
- [ ] Paso 3.2: Implementar `_loadThingsBoardConfig()`
- [ ] Paso 3.2: Modificar función `load()` en project
- [ ] Test 2: Verificar auto-inicio con config

### Fase 4: Mejoras 🎨 OPCIONAL
- [ ] Paso 4.1: Implementar `rediscoverDeviceTags()`
- [ ] Paso 4.1: Agregar a exports

### Compilación y Despliegue
- [ ] Compilar frontend: `cd client && npm run build`
- [ ] Reiniciar servidor: `cd server && npm start`
- [ ] Verificar logs: `tail -f _logs/fuxa.log | grep ThingsBoard`

---

## 🎯 Resultado Esperado

Después de implementar todos los pasos:

1. ✅ FUXA arranca y lee `thingsboard-config.json`
2. ✅ Crea dispositivos ThingsBoard automáticamente
3. ✅ Se conecta a ThingsBoard al arrancar
4. ✅ Descubre todos los dispositivos de TB
5. ✅ Crea tags para toda la telemetría
6. ✅ Persiste los tags en la base de datos
7. ✅ Los tags están disponibles para HMI
8. ✅ Todo funciona sin intervención manual

**¡FUXA completamente integrado con ThingsBoard desde el arranque!** 🚀
