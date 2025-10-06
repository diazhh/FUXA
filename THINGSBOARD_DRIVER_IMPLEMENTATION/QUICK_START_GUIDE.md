# Guía Rápida de Implementación - Driver ThingsBoard

## 🚀 Inicio Rápido (30 minutos)

Esta guía te llevará desde cero hasta tener el driver ThingsBoard funcionando en FUXA.

---

## Paso 1: Preparar el Entorno (5 min)

### 1.1 Verificar Requisitos

```bash
# Verificar Node.js
node --version  # Debe ser v18.x

# Verificar que FUXA está instalado
cd /home/jsalazar/FUXA
ls -la server/ client/
```

### 1.2 Instalar ThingsBoard (Docker)

```bash
# Opción A: ThingsBoard con PostgreSQL
docker run -d --name thingsboard \
  -p 8080:9090 -p 1883:1883 \
  -e TB_QUEUE_TYPE=in-memory \
  thingsboard/tb-postgres

# Opción B: ThingsBoard CE (Community Edition)
docker run -d --name thingsboard \
  -p 8080:9090 -p 1883:1883 \
  thingsboard/tb-ce

# Esperar 30 segundos para que inicie
sleep 30

# Verificar que está corriendo
curl http://localhost:8080/login
```

**Credenciales por defecto:**
- URL: `http://localhost:8080`
- Usuario: `tenant@thingsboard.org`
- Password: `tenant`

---

## Paso 2: Copiar Archivos del Driver (5 min)

### 2.1 Backend

```bash
cd /home/jsalazar/FUXA

# Crear directorio del driver
mkdir -p server/runtime/devices/thingsboard

# Copiar archivos del driver
cp THINGSBOARD_DRIVER_IMPLEMENTATION/backend/thingsboard/*.js \
   server/runtime/devices/thingsboard/

# Verificar
ls -la server/runtime/devices/thingsboard/
# Deberías ver: index.js, tb-rest-client.js, tb-mqtt-client.js, tb-device-mapper.js
```

### 2.2 Frontend

```bash
# Crear directorio del componente
mkdir -p client/src/app/device/tag-property/tag-property-edit-thingsboard

# Copiar archivos del componente
cp THINGSBOARD_DRIVER_IMPLEMENTATION/frontend/tag-property-edit-thingsboard.component.* \
   client/src/app/device/tag-property/tag-property-edit-thingsboard/

# Verificar
ls -la client/src/app/device/tag-property/tag-property-edit-thingsboard/
# Deberías ver: .ts, .html, .scss
```

---

## Paso 3: Modificar Archivos Existentes (10 min)

### 3.1 Backend - Registrar el Driver

**Archivo:** `server/runtime/devices/device.js`

```bash
# Abrir el archivo
nano server/runtime/devices/device.js
```

**Cambio 1:** Importar el driver (línea ~19)
```javascript
var ThingsBoardClient = require('./thingsboard');
```

**Cambio 2:** Agregar caso en constructor (después de línea ~115)
```javascript
} else if (data.type === DeviceEnum.ThingsBoard) {
    if (!ThingsBoardClient) {
        return null;
    }
    comm = ThingsBoardClient.create(data, logger, events, manager, runtime);
}
```

**Cambio 3:** Agregar al enum (línea ~558)
```javascript
var DeviceEnum = {
    S7: 'SiemensS7',
    OPCUA: 'OPCUA',
    ModbusRTU: 'ModbusRTU',
    ModbusTCP: 'ModbusTCP',
    BACnet: 'BACnet',
    WebAPI: 'WebAPI',
    MQTTclient: 'MQTTclient',
    EthernetIP: 'EthernetIP',
    FuxaServer: 'FuxaServer',
    ODBC: 'ODBC',
    ADSclient: 'ADSclient',
    GPIO: 'GPIO',
    internal: 'internal',
    WebCam: 'WebCam',
    MELSEC: 'MELSEC',
    ThingsBoard: 'ThingsBoard'  // ← AGREGAR
}
```

**Cambio 4:** Agregar a loadPlugin (después de línea ~532)
```javascript
} else if (type === DeviceEnum.ThingsBoard) {
    ThingsBoardClient = require(module);
}
```

**Cambio 5:** Agregar soporte browse (después de línea ~304)
```javascript
} else if (data.type === DeviceEnum.ThingsBoard) {
    comm.browse(path, callback).then(function (result) {
        resolve(result);
    }).catch(function (err) {
        reject(err);
    });
}
```

### 3.2 Frontend - Registrar el Tipo

**Archivo:** `client/src/app/_models/device.ts`

```bash
nano client/src/app/_models/device.ts
```

**Cambio:** Agregar al enum DeviceType (línea ~233)
```typescript
export enum DeviceType {
    FuxaServer = 'FuxaServer',
    SiemensS7 = 'SiemensS7',
    OPCUA = 'OPCUA',
    BACnet = 'BACnet',
    ModbusRTU = 'ModbusRTU',
    ModbusTCP = 'ModbusTCP',
    WebAPI = 'WebAPI',
    MQTTclient = 'MQTTclient',
    internal = 'internal',
    EthernetIP = 'EthernetIP',
    ODBC = 'ODBC',
    ADSclient = 'ADSclient',
    GPIO = 'GPIO',
    WebCam = 'WebCam',
    MELSEC = 'MELSEC',
    ThingsBoard = 'ThingsBoard'  // ← AGREGAR
}
```

### 3.3 Frontend - Registrar Componente

**Archivo:** `client/src/app/app.module.ts`

```bash
nano client/src/app/app.module.ts
```

**Cambio 1:** Importar componente (al inicio)
```typescript
import { TagPropertyEditThingsboardComponent } from './device/tag-property/tag-property-edit-thingsboard/tag-property-edit-thingsboard.component';
```

**Cambio 2:** Agregar a declarations
```typescript
@NgModule({
    declarations: [
        // ... otros componentes ...
        TagPropertyEditThingsboardComponent,  // ← AGREGAR
    ],
    // ...
})
```

### 3.4 Frontend - Agregar a Device Map

**Archivo:** `client/src/app/device/device-map/device-map.component.ts`

```bash
nano client/src/app/device/device-map/device-map.component.ts
```

**Cambio:** En ngOnInit() agregar (línea ~145)
```typescript
this.plugins.push(DeviceType.ThingsBoard);
```

### 3.5 Frontend - Agregar Template de Configuración

**Archivo:** `client/src/app/device/device-property/device-property.component.html`

```bash
nano client/src/app/device/device-property/device-property.component.html
```

**Cambio:** Agregar después de la sección MELSEC (buscar `*ngSwitchCase="deviceType.MELSEC"`)

```html
<div *ngSwitchCase="deviceType.ThingsBoard">
    <div class="my-form-field" style="display: block;margin-bottom: 10px;">
        <span>ThingsBoard Server URL</span>
        <input [(ngModel)]="data.device.property.serverUrl" 
               style="width: 350px" 
               type="text"
               placeholder="http://localhost:8080">
    </div>
    <div class="my-form-field" style="display: block;margin-bottom: 10px;">
        <span>{{ 'general.username' | translate }}</span>
        <input [(ngModel)]="data.device.property.username" 
               style="width: 350px" 
               type="text"
               placeholder="tenant@thingsboard.org">
    </div>
    <div class="my-form-field" style="display: block;margin-bottom: 10px;">
        <span>{{ 'general.password' | translate }}</span>
        <input [(ngModel)]="data.device.property.password" 
               style="width: 350px" 
               [type]="showPassword ? 'text' : 'password'">
        <mat-icon matSuffix 
                  (click)="showPassword = !showPassword" 
                  class="show-password">
            {{showPassword ? 'visibility' : 'visibility_off'}}
        </mat-icon>
    </div>
    <div class="my-form-field" style="display: block;margin-bottom: 10px;">
        <mat-checkbox [(ngModel)]="data.device.property.useMqtt">
            Use MQTT for real-time telemetry
        </mat-checkbox>
    </div>
</div>
```

---

## Paso 4: Compilar y Ejecutar (10 min)

### 4.1 Compilar Frontend

```bash
cd client
npm install  # Solo si es primera vez
npm run build
```

### 4.2 Iniciar FUXA

```bash
cd ../server
npm start
```

**Espera a ver:**
```
FUXA Server is running on port: 1881
```

### 4.3 Abrir en Navegador

```
http://localhost:1881
```

---

## Paso 5: Configurar y Probar (10 min)

### 5.1 Crear Dispositivo de Prueba en ThingsBoard

1. Abrir ThingsBoard: http://localhost:8080
2. Login: `tenant@thingsboard.org` / `tenant`
3. Ir a **Devices** → **Add Device**
4. Name: `Test Device`
5. Device Profile: `default`
6. Click **Add**

### 5.2 Enviar Telemetría de Prueba

```bash
# Obtener Access Token del dispositivo
# En ThingsBoard: Devices → Test Device → Copy Access Token

# Enviar telemetría
curl -X POST http://localhost:8080/api/v1/YOUR_ACCESS_TOKEN/telemetry \
  -H "Content-Type: application/json" \
  -d '{
    "temperature": 22.5,
    "humidity": 65,
    "pressure": 1013
  }'
```

### 5.3 Configurar en FUXA

1. En FUXA, ir a **Editor** → **Connections**
2. Click **Add Device** (+)
3. Configurar:
   - **Name:** `ThingsBoard Server`
   - **Type:** `ThingsBoard`
   - **Server URL:** `http://localhost:8080`
   - **Username:** `tenant@thingsboard.org`
   - **Password:** `tenant`
   - **Use MQTT:** ✅ Enabled
   - **Polling:** `5 sec`
   - **Enable:** ✅ Enabled
4. Click **OK**

### 5.4 Auto-Descubrir Dispositivos

1. Seleccionar el dispositivo ThingsBoard
2. Click **Browse** o **Add Tags**
3. Deberías ver:
   ```
   📁 Test Device
   ├─ 🏷️ temperature
   ├─ 🏷️ humidity
   └─ 🏷️ pressure
   ```
4. Seleccionar los tags deseados
5. Click **Add Selected Tags**

### 5.5 Crear Vista y Visualizar

1. Ir a **Editor** → **Views**
2. Crear nueva vista
3. Agregar controles (gauges, charts, etc.)
4. Vincular a los tags de ThingsBoard
5. Click **Run** para ver en tiempo real

---

## 🎉 ¡Listo!

Ahora tienes el driver ThingsBoard funcionando. Los datos deberían actualizarse en tiempo real.

---

## Verificación de Funcionamiento

### ✅ Checklist

- [ ] ThingsBoard está corriendo (http://localhost:8080)
- [ ] FUXA está corriendo (http://localhost:1881)
- [ ] Dispositivo ThingsBoard aparece en lista de tipos
- [ ] Conexión exitosa (estado verde)
- [ ] Browse muestra dispositivos
- [ ] Tags se crean automáticamente
- [ ] Valores se actualizan en tiempo real
- [ ] Escritura de valores funciona

### 🔍 Troubleshooting

**Problema:** "Cannot find module './thingsboard'"
```bash
# Verificar que los archivos existen
ls -la server/runtime/devices/thingsboard/
```

**Problema:** "Connection failed"
```bash
# Verificar que ThingsBoard está corriendo
curl http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"tenant@thingsboard.org","password":"tenant"}'
```

**Problema:** "No devices found"
```bash
# Verificar que hay dispositivos en ThingsBoard
curl -X GET http://localhost:8080/api/tenant/devices?pageSize=10 \
  -H "X-Authorization: Bearer YOUR_JWT_TOKEN"
```

**Problema:** "MQTT connection refused"
```bash
# Verificar puerto MQTT
netstat -an | grep 1883
```

---

## Logs Útiles

### Backend Logs
```bash
# Ver logs de FUXA
tail -f server/_logs/fuxa.log

# Buscar errores del driver
grep -i "thingsboard" server/_logs/fuxa.log
```

### Browser Console
```javascript
// En Chrome DevTools (F12)
// Buscar errores relacionados con ThingsBoard
```

---

## Próximos Pasos

1. ✅ **Configurar múltiples dispositivos**
2. ✅ **Crear dashboards avanzados**
3. ✅ **Configurar alarmas**
4. ✅ **Habilitar DAQ para históricos**
5. ✅ **Configurar escritura de comandos RPC**

---

## Recursos Adicionales

- **Documentación completa:** `THINGSBOARD_DRIVER_DEVELOPMENT.md`
- **Código fuente:** `THINGSBOARD_DRIVER_IMPLEMENTATION/`
- **ThingsBoard Docs:** https://thingsboard.io/docs/
- **FUXA Wiki:** https://github.com/frangoteam/FUXA/wiki

---

**Tiempo total estimado:** 30-40 minutos  
**Nivel de dificultad:** Medio  
**Última actualización:** 2025-10-06
