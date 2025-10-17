# 🚀 ThingsBoard Auto-inicio - Guía de Uso

## ✅ Implementación Completada

Se han implementado exitosamente **todas las funcionalidades** para que FUXA se conecte automáticamente a ThingsBoard al arrancar y descubra dispositivos y telemetría.

---

## 📋 Cambios Implementados

### **Fase 1: Persistencia de Tags** ✅
- ✅ Listener `device-tags-update` agregado en `/server/runtime/devices/index.js`
- ✅ Función `handleDeviceTagsUpdate()` que guarda tags automáticamente en BD
- ✅ Mejoras en `_discoverDevices()` para evitar duplicación
- ✅ Logs mejorados con estadísticas detalladas

### **Fase 2: Flag AutoDiscover** ✅
- ✅ Campo `autoDiscover` agregado al modelo TypeScript
- ✅ Checkbox en UI para activar/desactivar auto-descubrimiento
- ✅ Flag implementado en driver ThingsBoard
- ✅ Control granular por dispositivo

### **Fase 3: Auto-inicio con Configuración** ✅
- ✅ Archivo `thingsboard-config.example.json` creado
- ✅ Función `_loadThingsBoardConfig()` implementada
- ✅ Carga automática al arranque de FUXA
- ✅ Validación y manejo de errores

---

## 🎯 Cómo Usar

### Opción 1: Configuración Automática (Recomendado)

#### Paso 1: Crear archivo de configuración

```bash
cd /home/jsalazar/FUXA/server/_appdata
cp thingsboard-config.example.json thingsboard-config.json
```

#### Paso 2: Editar configuración

```bash
nano thingsboard-config.json
```

**Ejemplo de configuración:**

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
    }
  ]
}
```

**Campos importantes:**
- `name`: Nombre del dispositivo en FUXA
- `enabled`: `true` para conectar al arrancar, `false` para deshabilitar
- `polling`: Intervalo de polling en milisegundos (5000 = 5 segundos)
- `serverUrl`: URL de tu servidor ThingsBoard
- `username`: Usuario de ThingsBoard
- `password`: Contraseña de ThingsBoard
- `useMqtt`: `true` para usar MQTT, `false` para solo REST API
- `autoDiscover`: `true` para auto-descubrir dispositivos y crear tags

#### Paso 3: Compilar frontend (si modificaste UI)

```bash
cd /home/jsalazar/FUXA/client
npm run build
```

#### Paso 4: Reiniciar FUXA

```bash
cd /home/jsalazar/FUXA/server
npm start
```

#### Paso 5: Verificar logs

Deberías ver:

```
[INF] Loading 1 ThingsBoard device(s) from config file
[INF] ThingsBoard device 'ThingsBoard Local' created from config (enabled: true, autoDiscover: true)
[INF] ThingsBoard config loaded: 1 devices created, 0 skipped
[INF] 'ThingsBoard Local' connecting to ThingsBoard http://localhost:8080
[INF] 'ThingsBoard Local' authenticated successfully
[INF] 'ThingsBoard Local' starting device discovery...
[INF] 'ThingsBoard Local' found 5 ThingsBoard devices
[INF] 'ThingsBoard Local' device 'Sensor1' has 3 telemetry keys
[INF] 'ThingsBoard Local' discovery complete: 5 devices processed, 15 tags created, 0 tags skipped
[INF] 'ThingsBoard Local' emitting device-tags-update event with 15 new tags
[INF] Auto-discovered tags saved for device 'ThingsBoard Local': 15 new tags (15 total)
```

---

### Opción 2: Configuración Manual desde UI

#### Paso 1: Abrir FUXA

```
http://localhost:1881
```

#### Paso 2: Ir a Devices

Click en **Devices** en el menú lateral

#### Paso 3: Agregar dispositivo ThingsBoard

1. Click en **+** (Add Device)
2. **Name**: "Mi ThingsBoard"
3. **Type**: Seleccionar "ThingsBoard"
4. **Enabled**: ✓ Activar
5. **Polling**: 5000 (ms)

#### Paso 4: Configurar propiedades

1. **Server URL**: `http://localhost:8080`
2. **Username**: `tenant@thingsboard.org`
3. **Password**: `tenant`
4. **Use MQTT for real-time telemetry**: ✓ (opcional)
5. **Auto-discover devices on connect**: ✓ (activar)

#### Paso 5: Guardar

Click en **Save**

#### Paso 6: Verificar conexión

- El dispositivo debe mostrar estado **"Connected"** (verde)
- Ir a la pestaña **Tags**
- Deberías ver todos los tags auto-descubiertos

---

## 📊 Formato de Tags

Los tags se crean automáticamente con el siguiente formato:

### Tag ID
```
{deviceId}_{telemetryKey}
```
Ejemplo: `a1b2c3d4-e5f6-7890-abcd-ef1234567890_temperature`

### Tag Name
```
{deviceName}.{telemetryKey}
```
Ejemplo: `SensorCocina.temperature`

### Tag Address
```
{deviceId}:{telemetryKey}
```
Ejemplo: `a1b2c3d4-e5f6-7890-abcd-ef1234567890:temperature`

---

## 🔧 Configuración Avanzada

### Múltiples Instancias de ThingsBoard

Puedes configurar múltiples servidores ThingsBoard:

```json
{
  "devices": [
    {
      "name": "ThingsBoard Local",
      "enabled": true,
      "property": {
        "serverUrl": "http://localhost:8080",
        "username": "tenant@thingsboard.org",
        "password": "tenant",
        "autoDiscover": true
      }
    },
    {
      "name": "ThingsBoard Production",
      "enabled": true,
      "property": {
        "serverUrl": "https://thingsboard.example.com",
        "username": "admin@example.com",
        "password": "secure-password",
        "autoDiscover": true
      }
    }
  ]
}
```

### Deshabilitar Auto-descubrimiento

Si quieres conectar a ThingsBoard pero **NO** auto-descubrir dispositivos:

```json
{
  "property": {
    "serverUrl": "http://localhost:8080",
    "username": "tenant@thingsboard.org",
    "password": "tenant",
    "autoDiscover": false
  }
}
```

En este caso, deberás crear los tags manualmente.

### Usar Solo REST API (Sin MQTT)

Para evitar problemas de autenticación MQTT:

```json
{
  "property": {
    "serverUrl": "http://localhost:8080",
    "username": "tenant@thingsboard.org",
    "password": "tenant",
    "useMqtt": false,
    "autoDiscover": true
  }
}
```

---

## 🎨 Usar Tags en HMI

Una vez que los tags están auto-descubiertos, puedes usarlos en cualquier componente:

### Ejemplo 1: Mostrar Temperatura

1. Agrega un componente **Text** al HMI
2. Selecciona el tag: `SensorCocina.temperature`
3. El valor se actualizará automáticamente

### Ejemplo 2: Gráfica de Temperatura

1. Agrega un componente **Chart**
2. Agrega serie con el tag: `SensorCocina.temperature`
3. La gráfica mostrará el histórico

### Ejemplo 3: Alarma

1. Ve a **Alarms**
2. Crea nueva alarma
3. Condición: `SensorCocina.temperature > 30`

---

## 🔍 Verificación

### Verificar Tags en Base de Datos

```bash
cd /home/jsalazar/FUXA/server
node -e "
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('_appdata/project.fuxap.db');
db.all('SELECT * FROM devices WHERE name LIKE \"%ThingsBoard%\"', (err, rows) => {
    rows.forEach(row => {
        const device = JSON.parse(row.value);
        console.log('Device:', device.name);
        console.log('Type:', device.type);
        console.log('Enabled:', device.enabled);
        console.log('Tags:', Object.keys(device.tags).length);
        console.log('AutoDiscover:', device.property.autoDiscover);
    });
    db.close();
});
"
```

### Verificar Logs

```bash
tail -f /home/jsalazar/FUXA/server/_logs/fuxa.log | grep ThingsBoard
```

---

## 🐛 Troubleshooting

### Problema: No se crean tags

**Síntoma:** Logs muestran "found 0 ThingsBoard devices"

**Soluciones:**
1. Verifica que hay dispositivos en ThingsBoard
2. Verifica credenciales (username/password)
3. Verifica que el usuario tiene permisos para ver dispositivos

### Problema: Tags creados pero no persisten

**Síntoma:** Tags aparecen pero desaparecen al reiniciar

**Solución:**
- Verifica que el listener está registrado (debe aparecer en logs)
- Busca: "Auto-discovered tags saved for device"
- Si no aparece, revisa que los cambios se aplicaron correctamente

### Problema: Error de autenticación

**Síntoma:** "Login failed: User account is not active"

**Soluciones:**
1. Verifica credenciales en ThingsBoard
2. Verifica que el usuario está activo
3. Prueba login manual en ThingsBoard web

### Problema: Dispositivo no se crea al arrancar

**Síntoma:** No aparece mensaje "Loading X ThingsBoard device(s)"

**Soluciones:**
1. Verifica que existe `thingsboard-config.json` (sin `.example`)
2. Verifica formato JSON (usa un validador JSON)
3. Verifica permisos del archivo: `chmod 644 thingsboard-config.json`

---

## 📝 Archivos Modificados

### Backend (Server)

1. `/server/runtime/devices/index.js`
   - Agregado listener `device-tags-update`
   - Agregada función `handleDeviceTagsUpdate()`

2. `/server/runtime/devices/thingsboard/index.js`
   - Mejorado `_discoverDevices()` con estadísticas
   - Agregado flag `autoDiscover`
   - Uso condicional de auto-descubrimiento

3. `/server/runtime/project/index.js`
   - Agregada función `_loadThingsBoardConfig()`
   - Modificado `load()` para cargar configuración

4. `/server/_appdata/thingsboard-config.example.json`
   - Archivo de ejemplo creado

### Frontend (Client)

1. `/client/src/app/_models/device.ts`
   - Agregado campo `autoDiscover` a `DeviceNetProperty`

2. `/client/src/app/device/device-property/device-property.component.html`
   - Agregado checkbox para `autoDiscover`

3. `/client/src/app/device/device-property/device-property.component.ts`
   - Inicialización de `autoDiscover` por defecto

---

## 🎉 Resultado Final

Después de implementar estos cambios:

✅ **FUXA arranca** y lee `thingsboard-config.json`  
✅ **Crea dispositivos** ThingsBoard automáticamente  
✅ **Se conecta** a ThingsBoard al arrancar  
✅ **Descubre** todos los dispositivos de TB  
✅ **Crea tags** para toda la telemetría  
✅ **Persiste** los tags en la base de datos  
✅ **Tags disponibles** inmediatamente para HMI  
✅ **Todo funciona** sin intervención manual  

---

## 🔐 Seguridad

### Proteger Credenciales

El archivo `thingsboard-config.json` contiene credenciales en texto plano.

**Recomendaciones:**

1. **Permisos restrictivos:**
```bash
chmod 600 /home/jsalazar/FUXA/server/_appdata/thingsboard-config.json
```

2. **No commitear a Git:**
```bash
echo "server/_appdata/thingsboard-config.json" >> .gitignore
```

3. **Usar variables de entorno (futuro):**
```json
{
  "property": {
    "serverUrl": "${TB_SERVER_URL}",
    "username": "${TB_USERNAME}",
    "password": "${TB_PASSWORD}"
  }
}
```

---

## 📚 Documentación Adicional

- `ROADMAP_AUTOSTART_THINGSBOARD.md` - Roadmap completo
- `IMPLEMENTATION_PLAN.md` - Plan de implementación detallado
- `ANALISIS_CODIGO_THINGSBOARD.md` - Análisis del código
- `THINGSBOARD_DEVICE_DISCOVERY.md` - Cómo funciona el auto-descubrimiento
- `THINGSBOARD_STATUS.md` - Estado de la integración

---

## ✨ Próximos Pasos Opcionales

### Mejoras Futuras

1. **Encriptación de passwords** en archivo de configuración
2. **Variables de entorno** para credenciales
3. **Re-descubrimiento manual** desde UI
4. **Filtrado de dispositivos** por tipo o etiqueta
5. **Paginación** para >100 dispositivos
6. **Indicadores de progreso** en UI durante descubrimiento

---

## 🎯 Soporte

Si encuentras problemas:

1. Revisa los logs: `tail -f server/_logs/fuxa.log`
2. Verifica la configuración en BD (comando arriba)
3. Consulta la documentación en `tb-docs/`
4. Revisa los archivos de implementación

---

**¡FUXA está ahora completamente integrado con ThingsBoard desde el arranque!** 🚀
