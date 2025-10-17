# 🚀 Roadmap: Auto-conexión ThingsBoard al Arranque de FUXA

## 📋 Objetivo

Modificar FUXA para que al iniciar:
1. Se conecte automáticamente a ThingsBoard usando credenciales guardadas
2. Descubra todos los dispositivos de ThingsBoard
3. Cree automáticamente tags para toda la telemetría disponible
4. Los tags estén disponibles inmediatamente para componentes visuales

---

## 🔍 Análisis del Código Actual

### Estado Actual de la Integración ThingsBoard

**✅ Ya Implementado:**
- Driver ThingsBoard completo (`/server/runtime/devices/thingsboard/`)
- Auto-descubrimiento de dispositivos en el método `connect()`
- Creación automática de tags en `_discoverDevices()`
- Evento `device-tags-update` que se emite cuando se crean tags
- REST API client para comunicación con ThingsBoard
- MQTT client opcional para telemetría en tiempo real

**❌ Problema Actual:**
- Los tags creados automáticamente NO se persisten en la base de datos
- El evento `device-tags-update` se emite pero nadie lo escucha
- Al reiniciar FUXA, los tags desaparecen
- Los dispositivos ThingsBoard deben configurarse manualmente desde la UI

### Flujo Actual de Arranque

```
main.js
  ↓
FUXA.init() → runtime.init()
  ↓
runtime.start()
  ↓
project.load() → Carga dispositivos de BD
  ↓
devices.start() → Inicia todos los dispositivos enabled
  ↓
Device.start() → checkStatus() → connect()
  ↓
ThingsBoard.connect() → _discoverDevices()
  ↓
events.emit('device-tags-update') → ⚠️ NADIE ESCUCHA
```

---

## 🎯 Roadmap de Implementación

### **Fase 1: Persistencia Automática de Tags** ⭐ CRÍTICO

**Objetivo:** Hacer que los tags auto-descubiertos se guarden en la base de datos

#### Tarea 1.1: Escuchar el evento `device-tags-update`
**Archivo:** `/server/runtime/devices/index.js`

**Cambios:**
1. Agregar listener para el evento `device-tags-update` en la función `init()`
2. Cuando se reciba el evento, actualizar el dispositivo en la base de datos
3. Persistir los nuevos tags usando `runtime.project.setProjectData()`

**Código a agregar:**
```javascript
// En la función init()
runtime.events.on('device-tags-update', handleDeviceTagsUpdate);

// Nueva función
function handleDeviceTagsUpdate(event) {
    try {
        const { deviceId, tags } = event;
        
        // Obtener dispositivo actual
        const device = runtime.project.getDevice(deviceId);
        if (!device) {
            runtime.logger.warn(`Device ${deviceId} not found for tags update`);
            return;
        }
        
        // Actualizar tags
        device.tags = tags;
        
        // Persistir en base de datos
        runtime.project.setProjectData(
            runtime.project.ProjectDataCmdType.SetDevice, 
            device
        ).then(() => {
            runtime.logger.info(`Auto-discovered tags saved for device '${device.name}': ${Object.keys(tags).length} tags`);
        }).catch(err => {
            runtime.logger.error(`Failed to save auto-discovered tags: ${err}`);
        });
        
    } catch (err) {
        runtime.logger.error(`Error handling device-tags-update: ${err}`);
    }
}
```

**Impacto:** Los tags descubiertos se guardarán automáticamente en la BD

---

#### Tarea 1.2: Evitar duplicación de tags en reconexiones
**Archivo:** `/server/runtime/devices/thingsboard/index.js`

**Cambios:**
1. Modificar `_discoverDevices()` para no duplicar tags existentes
2. Solo emitir evento si hay tags nuevos

**Código a modificar:**
```javascript
var _discoverDevices = async function () {
    try {
        logger.info(`'${data.name}' discovering ThingsBoard devices...`, true);
        
        // Get all devices from ThingsBoard
        const devices = await restClient.getDevices(100, 0);
        logger.info(`'${data.name}' found ${devices.length} ThingsBoard devices`, true);
        
        // Track if we created any new tags
        let tagsCreated = 0;
        let existingTags = Object.keys(data.tags).length;
        
        // Create tags for each device
        for (const device of devices) {
            const deviceId = device.id.id;
            const deviceName = device.name;
            
            // Get telemetry keys for this device
            const telemetryKeys = await restClient.getTelemetryKeys(deviceId);
            
            if (telemetryKeys.length > 0) {
                logger.info(`'${data.name}' device '${deviceName}' has ${telemetryKeys.length} telemetry keys`, true);
                
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
                            type: 'number',
                            device: data.id,
                            memaddress: `${deviceId}:${key}`,
                            divisor: 1,
                            daq: {}
                        };
                        tagsCreated++;
                    }
                }
            }
        }
        
        // Only emit if we created NEW tags
        const newTagsCount = Object.keys(data.tags).length - existingTags;
        if (newTagsCount > 0) {
            logger.info(`'${data.name}' created ${newTagsCount} new tags from ThingsBoard devices`, true);
            events.emit('device-tags-update', { deviceId: data.id, tags: data.tags });
        } else {
            logger.info(`'${data.name}' no new tags to create (${existingTags} tags already exist)`, true);
        }
        
    } catch (err) {
        logger.error(`'${data.name}' device discovery error: ${err}`);
    }
}
```

**Impacto:** Evita duplicación y solo persiste cuando hay cambios

---

### **Fase 2: Configuración de Auto-inicio** ⭐ IMPORTANTE

**Objetivo:** Permitir configurar dispositivos ThingsBoard para auto-descubrimiento

#### Tarea 2.1: Agregar flag de auto-descubrimiento
**Archivo:** `/client/src/app/_models/device.ts`

**Cambios:**
```typescript
export interface ThingsBoardProperty {
    serverUrl: string;
    username: string;
    password: string;
    useMqtt?: boolean;
    autoDiscover?: boolean;  // NUEVO: Auto-descubrir dispositivos al conectar
}
```

#### Tarea 2.2: Actualizar UI para mostrar opción
**Archivo:** `/client/src/app/device/device-property/device-property.component.html`

**Cambios:**
Agregar checkbox para auto-descubrimiento:
```html
<div *ngIf="data.type === 'ThingsBoard'">
    <!-- Campos existentes... -->
    
    <mat-checkbox [(ngModel)]="data.property.autoDiscover" 
                  name="autoDiscover"
                  style="margin-top: 10px;">
        Auto-discover devices on connect
    </mat-checkbox>
    <div class="help-text">
        Automatically discover all ThingsBoard devices and create tags for their telemetry
    </div>
</div>
```

#### Tarea 2.3: Usar el flag en el driver
**Archivo:** `/server/runtime/devices/thingsboard/index.js`

**Cambios:**
```javascript
// En la función load()
var autoDiscover = true;  // Default true
if (data.property) {
    serverUrl = data.property.serverUrl || data.property.address || '';
    username = data.property.username || '';
    password = data.property.password || '';
    useMqtt = data.property.useMqtt !== false;
    autoDiscover = data.property.autoDiscover !== false;  // NUEVO
}

// En la función connect()
if (autoDiscover) {
    logger.info(`'${data.name}' starting device discovery...`, true);
    await _discoverDevices();
    logger.info(`'${data.name}' device discovery completed`, true);
} else {
    logger.info(`'${data.name}' auto-discovery disabled`, true);
}
```

**Impacto:** Control granular sobre qué dispositivos auto-descubren

---

### **Fase 3: Pre-configuración de Dispositivos ThingsBoard** 🎯 OBJETIVO PRINCIPAL

**Objetivo:** Permitir que FUXA arranque con dispositivos ThingsBoard pre-configurados

#### Tarea 3.1: Crear archivo de configuración inicial
**Archivo:** `/server/_appdata/thingsboard-config.json` (nuevo)

**Formato:**
```json
{
  "devices": [
    {
      "name": "ThingsBoard Production",
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
```

#### Tarea 3.2: Cargar configuración al arranque
**Archivo:** `/server/runtime/project/index.js`

**Cambios:**
```javascript
// Nueva función
async function loadThingsBoardConfig() {
    try {
        const configPath = path.join(settings.workDir, 'thingsboard-config.json');
        
        if (!fs.existsSync(configPath)) {
            logger.info('No ThingsBoard config file found, skipping auto-configuration');
            return;
        }
        
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        if (!configData.devices || configData.devices.length === 0) {
            logger.info('ThingsBoard config file is empty');
            return;
        }
        
        logger.info(`Loading ${configData.devices.length} ThingsBoard device(s) from config`);
        
        for (const deviceConfig of configData.devices) {
            // Generate unique ID
            const deviceId = utils.getShortGUID('d-');
            
            // Check if device already exists
            const existingDevice = Object.values(data.devices).find(d => 
                d.name === deviceConfig.name && d.type === 'ThingsBoard'
            );
            
            if (existingDevice) {
                logger.info(`ThingsBoard device '${deviceConfig.name}' already exists, skipping`);
                continue;
            }
            
            // Create device object
            const device = {
                id: deviceId,
                name: deviceConfig.name,
                type: 'ThingsBoard',
                enabled: deviceConfig.enabled !== false,
                polling: deviceConfig.polling || 5000,
                tags: {},
                property: deviceConfig.property
            };
            
            // Save to database
            await setProjectData(ProjectDataCmdType.SetDevice, device);
            logger.info(`ThingsBoard device '${device.name}' created from config`);
        }
        
    } catch (err) {
        logger.error(`Error loading ThingsBoard config: ${err}`);
    }
}

// Modificar la función load() para llamar a loadThingsBoardConfig
function load() {
    return new Promise(function (resolve, reject) {
        data = { devices: {}, hmi: { views: [] }, texts: [], alarms: [] };
        
        // ... código existente de carga ...
        
        // Después de cargar devices, cargar config de ThingsBoard
        prjstorage.getSection(prjstorage.TableType.DEVICES).then(async drows => {
            for (var id = 0; id < drows.length; id++) {
                if (drows[id].name === 'server') {
                    data[drows[id].name] = JSON.parse(drows[id].value);
                } else {
                    data.devices[drows[id].name] = JSON.parse(drows[id].value);
                }
            }
            
            // NUEVO: Cargar configuración de ThingsBoard
            await loadThingsBoardConfig();
            
            // ... resto del código ...
        });
    });
}
```

**Impacto:** FUXA puede arrancar con dispositivos ThingsBoard pre-configurados

---

### **Fase 4: Mejoras de Experiencia de Usuario** 🎨 OPCIONAL

#### Tarea 4.1: Indicador de auto-descubrimiento en progreso
**Archivo:** `/server/runtime/devices/thingsboard/index.js`

**Cambios:**
```javascript
// Emitir eventos de progreso durante el descubrimiento
var _discoverDevices = async function () {
    try {
        // Emitir evento de inicio
        events.emit('device-status:changed', { 
            id: data.name, 
            status: 'discovering' 
        });
        
        logger.info(`'${data.name}' discovering ThingsBoard devices...`, true);
        
        // ... código de descubrimiento ...
        
        // Emitir evento de finalización
        events.emit('device-status:changed', { 
            id: data.name, 
            status: 'connect-ok' 
        });
        
    } catch (err) {
        logger.error(`'${data.name}' device discovery error: ${err}`);
        events.emit('device-status:changed', { 
            id: data.name, 
            status: 'connect-error' 
        });
    }
}
```

#### Tarea 4.2: Logs mejorados
**Archivo:** `/server/runtime/devices/thingsboard/index.js`

**Cambios:**
```javascript
// Agregar logs más detallados
logger.info(`'${data.name}' discovered ${devices.length} devices from ThingsBoard`, true);
logger.info(`'${data.name}' created ${tagsCreated} tags total`, true);
logger.info(`'${data.name}' tags breakdown:`, true);
for (const device of devices) {
    const deviceTags = Object.values(data.tags).filter(t => 
        t.address.startsWith(device.id.id)
    );
    logger.info(`  - ${device.name}: ${deviceTags.length} tags`, true);
}
```

#### Tarea 4.3: Comando para forzar re-descubrimiento
**Archivo:** `/server/runtime/devices/index.js`

**Cambios:**
```javascript
// Nueva función para forzar re-descubrimiento
function rediscoverDeviceTags(deviceName) {
    try {
        const device = runtime.project.getDevice(deviceName);
        if (!device || device.type !== 'ThingsBoard') {
            throw new Error('Device not found or not ThingsBoard type');
        }
        
        if (!activeDevices[device.id]) {
            throw new Error('Device not active');
        }
        
        // Limpiar tags actuales
        device.tags = {};
        
        // Reconectar para forzar descubrimiento
        activeDevices[device.id].stop().then(() => {
            activeDevices[device.id].start();
            runtime.logger.info(`Rediscovery triggered for device '${deviceName}'`);
        });
        
    } catch (err) {
        runtime.logger.error(`Error rediscovering device: ${err}`);
    }
}

// Exportar la función
module.exports = {
    // ... exportaciones existentes ...
    rediscoverDeviceTags: rediscoverDeviceTags
}
```

---

## 📊 Resumen de Cambios por Archivo

### Backend (Server)

| Archivo | Cambios | Prioridad |
|---------|---------|-----------|
| `/server/runtime/devices/index.js` | Agregar listener `device-tags-update` | ⭐ CRÍTICO |
| `/server/runtime/devices/thingsboard/index.js` | Evitar duplicación de tags | ⭐ CRÍTICO |
| `/server/runtime/devices/thingsboard/index.js` | Usar flag `autoDiscover` | ⭐ IMPORTANTE |
| `/server/runtime/project/index.js` | Cargar `thingsboard-config.json` | 🎯 OBJETIVO |
| `/server/_appdata/thingsboard-config.json` | Crear archivo de configuración | 🎯 OBJETIVO |

### Frontend (Client)

| Archivo | Cambios | Prioridad |
|---------|---------|-----------|
| `/client/src/app/_models/device.ts` | Agregar `autoDiscover` a interface | ⭐ IMPORTANTE |
| `/client/src/app/device/device-property/device-property.component.html` | Agregar checkbox auto-discover | 🎨 OPCIONAL |

---

## 🔄 Flujo Completo Después de Implementación

```
1. FUXA arranca
   ↓
2. runtime.init() → project.load()
   ↓
3. project.load() → loadThingsBoardConfig()
   ↓
4. Se crean dispositivos ThingsBoard desde config
   ↓
5. devices.start() → Inicia dispositivos enabled
   ↓
6. ThingsBoard.connect() → _discoverDevices()
   ↓
7. Se crean tags automáticamente
   ↓
8. events.emit('device-tags-update')
   ↓
9. handleDeviceTagsUpdate() escucha el evento
   ↓
10. Tags se persisten en base de datos
   ↓
11. Tags disponibles para componentes visuales
   ↓
12. ✅ FUXA listo con telemetría de ThingsBoard
```

---

## ✅ Checklist de Implementación

### Fase 1: Persistencia (CRÍTICO)
- [ ] Agregar listener `device-tags-update` en `/server/runtime/devices/index.js`
- [ ] Implementar función `handleDeviceTagsUpdate()`
- [ ] Modificar `_discoverDevices()` para evitar duplicación
- [ ] Probar que tags se persisten en BD
- [ ] Verificar que tags sobreviven a reinicio

### Fase 2: Configuración (IMPORTANTE)
- [ ] Agregar `autoDiscover` a `ThingsBoardProperty` interface
- [ ] Actualizar UI con checkbox
- [ ] Usar flag en driver ThingsBoard
- [ ] Probar activar/desactivar auto-discover

### Fase 3: Auto-inicio (OBJETIVO PRINCIPAL)
- [ ] Crear `thingsboard-config.json` de ejemplo
- [ ] Implementar `loadThingsBoardConfig()` en project
- [ ] Modificar `load()` para llamar a la función
- [ ] Probar arranque con config pre-cargada
- [ ] Verificar que no duplica dispositivos

### Fase 4: Mejoras (OPCIONAL)
- [ ] Agregar indicadores de progreso
- [ ] Mejorar logs
- [ ] Implementar comando de re-descubrimiento
- [ ] Documentar nuevas funcionalidades

---

## 🧪 Plan de Pruebas

### Test 1: Persistencia de Tags
```bash
1. Crear dispositivo ThingsBoard en FUXA
2. Conectar y esperar auto-descubrimiento
3. Verificar que tags aparecen en UI
4. Reiniciar FUXA
5. ✅ Verificar que tags siguen existiendo
```

### Test 2: Auto-inicio con Config
```bash
1. Crear /server/_appdata/thingsboard-config.json
2. Agregar configuración de dispositivo
3. Reiniciar FUXA
4. ✅ Verificar que dispositivo se crea automáticamente
5. ✅ Verificar que tags se descubren automáticamente
```

### Test 3: No Duplicación
```bash
1. Conectar dispositivo ThingsBoard
2. Esperar auto-descubrimiento (100 tags)
3. Desconectar y reconectar
4. ✅ Verificar que sigue habiendo 100 tags (no 200)
```

### Test 4: Flag AutoDiscover
```bash
1. Crear dispositivo con autoDiscover=false
2. Conectar
3. ✅ Verificar que NO se crean tags automáticamente
4. Cambiar a autoDiscover=true
5. Reconectar
6. ✅ Verificar que SÍ se crean tags
```

---

## 📝 Notas Importantes

### Seguridad
- ⚠️ El archivo `thingsboard-config.json` contiene credenciales
- Considerar encriptar passwords o usar variables de entorno
- No commitear el archivo con credenciales reales

### Rendimiento
- El auto-descubrimiento puede tardar con muchos dispositivos
- Considerar agregar timeout configurable
- Implementar paginación si hay >100 dispositivos

### Compatibilidad
- Mantener compatibilidad con dispositivos existentes
- No romper configuraciones manuales de tags
- Permitir mezcla de tags auto-descubiertos y manuales

---

## 🎯 Priorización Recomendada

### Sprint 1 (Esencial)
1. **Fase 1 completa** - Sin esto, los tags no persisten
2. **Fase 3 Tarea 3.1** - Crear archivo de configuración

### Sprint 2 (Importante)
3. **Fase 3 Tarea 3.2** - Cargar config al arranque
4. **Fase 2 Tarea 2.3** - Usar flag autoDiscover

### Sprint 3 (Mejoras)
5. **Fase 2 Tareas 2.1-2.2** - UI para autoDiscover
6. **Fase 4** - Mejoras de UX

---

## 📚 Recursos Adicionales

### Archivos Clave a Revisar
- `/server/runtime/devices/thingsboard/index.js` - Driver principal
- `/server/runtime/devices/index.js` - Gestor de dispositivos
- `/server/runtime/project/index.js` - Gestor de proyecto
- `/server/runtime/events.js` - Sistema de eventos

### Documentación Existente
- `THINGSBOARD_DEVICE_DISCOVERY.md` - Cómo funciona el auto-descubrimiento
- `THINGSBOARD_STATUS.md` - Estado actual de la integración
- `NEXT_STEPS.md` - Próximos pasos originales

---

## ✨ Resultado Final Esperado

Después de implementar este roadmap:

1. ✅ FUXA arranca y se conecta automáticamente a ThingsBoard
2. ✅ Descubre todos los dispositivos y telemetría disponible
3. ✅ Crea tags automáticamente para cada telemetría
4. ✅ Los tags se persisten en la base de datos
5. ✅ Los tags están disponibles inmediatamente para HMI
6. ✅ No requiere configuración manual de tags
7. ✅ Soporta múltiples instancias de ThingsBoard
8. ✅ Los tags sobreviven a reinicios de FUXA

**¡FUXA estará completamente integrado con ThingsBoard desde el arranque!** 🎉
