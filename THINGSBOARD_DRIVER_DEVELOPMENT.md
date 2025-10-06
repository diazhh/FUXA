# Desarrollo del Driver ThingsBoard para FUXA

## Tabla de Contenidos
1. [Introducción](#introducción)
2. [Arquitectura del Driver](#arquitectura-del-driver)
3. [Requisitos Previos](#requisitos-previos)
4. [Estructura de Archivos](#estructura-de-archivos)
5. [Implementación Paso a Paso](#implementación-paso-a-paso)
6. [API de ThingsBoard](#api-de-thingsboard)
7. [Funcionamiento de la Integración](#funcionamiento-de-la-integración)
8. [Testing y Validación](#testing-y-validación)
9. [Anexos](#anexos)

---

## Introducción

Este documento describe el proceso completo para desarrollar un driver nativo de **ThingsBoard** para FUXA. El driver permitirá:

- ✅ **Auto-descubrimiento** de dispositivos ThingsBoard
- ✅ **Lectura de telemetría** en tiempo real
- ✅ **Escritura de atributos** y comandos RPC
- ✅ **Navegación** de dispositivos y claves de telemetría
- ✅ **Autenticación** JWT con ThingsBoard
- ✅ **Conexión dual** REST API + MQTT para eficiencia

### Ventajas del Driver Nativo

| Característica | MQTT Genérico | Driver Nativo ThingsBoard |
|----------------|---------------|---------------------------|
| Auto-descubrimiento | ❌ No | ✅ Sí |
| Mapeo automático | ❌ Manual | ✅ Automático |
| Gestión de dispositivos | ❌ Manual | ✅ Integrada |
| Navegación de telemetría | ❌ No | ✅ Sí |
| Experiencia de usuario | ⚠️ Básica | ✅ Optimizada |

---

## Arquitectura del Driver

### Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                    FUXA Frontend (Angular)                  │
├─────────────────────────────────────────────────────────────┤
│  • DevicePropertyComponent (configuración)                  │
│  • DeviceMapComponent (gestión de dispositivos)             │
│  • TagPropertyEditThingsboardComponent (nuevo)              │
└────────────────────┬────────────────────────────────────────┘
                     │ Socket.IO / REST API
┌────────────────────▼────────────────────────────────────────┐
│                   FUXA Backend (Node.js)                    │
├─────────────────────────────────────────────────────────────┤
│  Device Manager                                             │
│  └─> ThingsBoard Driver (/runtime/devices/thingsboard/)     │
│       ├─> REST API Client (autenticación, dispositivos)     │
│       ├─> MQTT Client (telemetría en tiempo real)           │
│       └─> Tag Manager (mapeo automático)                    │
└────────────────────┬────────────────────────────────────────┘
                     │ REST API + MQTT
┌────────────────────▼────────────────────────────────────────┐
│                    ThingsBoard Server                       │
├─────────────────────────────────────────────────────────────┤
│  • REST API (puerto 8080)                                   │
│  • MQTT Broker (puerto 1883)                                │
│  • Dispositivos y Telemetría                                │
└─────────────────────────────────────────────────────────────┘
```

### Flujo de Datos

```
1. CONEXIÓN
   FUXA → REST API → ThingsBoard (autenticación JWT)
   FUXA → MQTT → ThingsBoard (conexión persistente)

2. AUTO-DESCUBRIMIENTO
   FUXA → GET /api/tenant/devices → ThingsBoard
   ThingsBoard → Lista de dispositivos → FUXA
   FUXA → GET /api/plugins/telemetry/DEVICE/{id}/keys/timeseries → ThingsBoard
   ThingsBoard → Claves de telemetría → FUXA

3. LECTURA DE DATOS (Tiempo Real)
   ThingsBoard → MQTT Publish → FUXA
   FUXA → Actualiza tags → Frontend

4. ESCRITURA DE DATOS
   FUXA → POST /api/plugins/rpc/twoway/{deviceId} → ThingsBoard
   ThingsBoard → Ejecuta comando → Dispositivo
```

---

## Requisitos Previos

### Software Necesario

- **Node.js**: v18.x (requerido por FUXA)
- **npm**: v9.x o superior
- **ThingsBoard**: v3.x o superior
- **Acceso a ThingsBoard**: Usuario con permisos de Tenant Administrator

### Dependencias NPM

```json
{
  "axios": "^0.30.0",      // Cliente HTTP (ya incluido en FUXA)
  "mqtt": "^4.3.7",        // Cliente MQTT (ya incluido en FUXA)
  "async": "^3.2.3"        // Utilidades async (ya incluido en FUXA)
}
```

### Credenciales ThingsBoard

Necesitarás:
- **URL del servidor**: `http://thingsboard-server:8080`
- **Usuario**: Email del usuario ThingsBoard
- **Contraseña**: Contraseña del usuario
- **Token JWT**: Se obtiene automáticamente tras login

---

## Estructura de Archivos

### Backend (Node.js)

```
server/
├── runtime/
│   └── devices/
│       ├── device.js                          # [MODIFICAR] Registrar nuevo tipo
│       └── thingsboard/                       # [CREAR] Nuevo directorio
│           ├── index.js                       # Driver principal
│           ├── tb-rest-client.js              # Cliente REST API
│           ├── tb-mqtt-client.js              # Cliente MQTT
│           └── tb-device-mapper.js            # Mapeo de dispositivos
└── package.json                               # [VERIFICAR] Dependencias
```

### Frontend (Angular)

```
client/src/app/
├── _models/
│   └── device.ts                              # [MODIFICAR] Agregar DeviceType.ThingsBoard
├── device/
│   ├── device-property/
│   │   ├── device-property.component.ts       # [MODIFICAR] Agregar caso ThingsBoard
│   │   └── device-property.component.html     # [MODIFICAR] Agregar template
│   ├── device-map/
│   │   └── device-map.component.ts            # [MODIFICAR] Agregar a plugins
│   └── tag-property/
│       └── tag-property-edit-thingsboard/     # [CREAR] Nuevo componente
│           ├── tag-property-edit-thingsboard.component.ts
│           ├── tag-property-edit-thingsboard.component.html
│           └── tag-property-edit-thingsboard.component.scss
└── app.module.ts                              # [MODIFICAR] Registrar componente
```

---

## Implementación Paso a Paso

### FASE 1: Backend - Estructura Base

#### Paso 1.1: Crear el Directorio del Driver

```bash
cd /home/jsalazar/FUXA/server/runtime/devices
mkdir thingsboard
cd thingsboard
```

#### Paso 1.2: Crear Cliente REST API (`tb-rest-client.js`)

Este módulo maneja toda la comunicación HTTP con ThingsBoard:

**Funcionalidades:**
- Autenticación JWT
- Obtener lista de dispositivos
- Obtener claves de telemetría
- Leer valores de telemetría
- Escribir atributos
- Ejecutar comandos RPC

**Endpoints principales:**
```javascript
POST   /api/auth/login                           // Login
GET    /api/tenant/devices                       // Lista dispositivos
GET    /api/plugins/telemetry/DEVICE/{id}/keys/timeseries  // Claves
GET    /api/plugins/telemetry/DEVICE/{id}/values/timeseries // Valores
POST   /api/plugins/telemetry/DEVICE/{id}/attributes/SHARED_SCOPE // Escribir
POST   /api/plugins/rpc/twoway/{deviceId}        // RPC
```

#### Paso 1.3: Crear Cliente MQTT (`tb-mqtt-client.js`)

Este módulo maneja la conexión MQTT para telemetría en tiempo real:

**Funcionalidades:**
- Conexión al broker MQTT de ThingsBoard
- Suscripción a telemetría de dispositivos
- Publicación de atributos
- Manejo de reconexiones

**Topics MQTT:**
```
v1/gateway/connect                    // Conectar gateway
v1/gateway/telemetry                  // Recibir telemetría
v1/gateway/attributes                 // Recibir/enviar atributos
v1/gateway/rpc                        // Comandos RPC
```

#### Paso 1.4: Crear Mapeador de Dispositivos (`tb-device-mapper.js`)

Este módulo convierte dispositivos ThingsBoard a tags FUXA:

**Funcionalidades:**
- Mapear dispositivo TB → Device FUXA
- Mapear telemetría TB → Tags FUXA
- Generar IDs únicos para tags
- Mantener sincronización

#### Paso 1.5: Crear Driver Principal (`index.js`)

Este es el punto de entrada del driver que implementa la interfaz requerida por FUXA.

**Métodos obligatorios:**
```javascript
connect()           // Conectar a ThingsBoard
disconnect()        // Desconectar
polling()           // Leer valores (opcional con MQTT)
load(data)          // Cargar configuración
getValue(id)        // Obtener valor de un tag
getValues()         // Obtener todos los valores
setValue(id, value) // Escribir valor
isConnected()       // Estado de conexión
browse(path)        // Navegar dispositivos/telemetría
bindAddDaq(fnc)     // Vincular DAQ
lastReadTimestamp() // Timestamp última lectura
```

### FASE 2: Backend - Registro del Driver

#### Paso 2.1: Modificar `device.js`

**Ubicación:** `/server/runtime/devices/device.js`

**Cambios necesarios:**

1. **Importar el driver** (línea ~19):
```javascript
var ThingsBoardClient = require('./thingsboard');
```

2. **Agregar caso en constructor** (línea ~116):
```javascript
} else if (data.type === DeviceEnum.ThingsBoard) {
    if (!ThingsBoardClient) {
        return null;
    }
    comm = ThingsBoardClient.create(data, logger, events, manager, runtime);
}
```

3. **Agregar al enum DeviceEnum** (línea ~558):
```javascript
var DeviceEnum = {
    S7: 'SiemensS7',
    OPCUA: 'OPCUA',
    // ... otros tipos ...
    ThingsBoard: 'ThingsBoard',  // ← AGREGAR ESTA LÍNEA
}
```

4. **Agregar a loadPlugin** (línea ~508):
```javascript
} else if (type === DeviceEnum.ThingsBoard) {
    ThingsBoardClient = require(module);
}
```

5. **Agregar soporte browse** (línea ~293):
```javascript
} else if (data.type === DeviceEnum.ThingsBoard) {
    comm.browse(path, callback).then(function (result) {
        resolve(result);
    }).catch(function (err) {
        reject(err);
    });
}
```

### FASE 3: Frontend - Modelos y Tipos

#### Paso 3.1: Modificar `device.ts`

**Ubicación:** `/client/src/app/_models/device.ts`

**Cambios necesarios:**

1. **Agregar tipo al enum** (línea ~233):
```typescript
export enum DeviceType {
    FuxaServer = 'FuxaServer',
    SiemensS7 = 'SiemensS7',
    OPCUA = 'OPCUA',
    // ... otros tipos ...
    ThingsBoard = 'ThingsBoard',  // ← AGREGAR ESTA LÍNEA
}
```

2. **Actualizar descriptor** (línea ~42):
```typescript
type: 'Device Type: ... | ThingsBoard',
```

3. **Agregar propiedades específicas** (después de línea ~231):
```typescript
export class ThingsBoardProperty extends DeviceNetProperty {
    /** ThingsBoard server URL */
    serverUrl: string;
    /** Username for authentication */
    username: string;
    /** Password for authentication */
    password: string;
    /** JWT Token (auto-generated) */
    token?: string;
    /** Use MQTT for real-time telemetry */
    useMqtt?: boolean = true;
}
```

### FASE 4: Frontend - Componente de Configuración

#### Paso 4.1: Crear Componente de Edición de Tags

**Ubicación:** `/client/src/app/device/tag-property/tag-property-edit-thingsboard/`

Crear 3 archivos:

1. **tag-property-edit-thingsboard.component.ts**
2. **tag-property-edit-thingsboard.component.html**
3. **tag-property-edit-thingsboard.component.scss**

**Funcionalidades:**
- Mostrar dispositivos disponibles
- Mostrar claves de telemetría
- Permitir selección de tags
- Configurar lectura/escritura

#### Paso 4.2: Modificar `device-property.component.html`

**Ubicación:** `/client/src/app/device/device-property/device-property.component.html`

**Agregar caso ThingsBoard** (después de línea ~200):

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
               type="text">
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

#### Paso 4.3: Modificar `device-property.component.ts`

**Agregar lógica de validación:**

```typescript
onDeviceTypeChanged() {
    // ... código existente ...
    if (this.data.device.type === DeviceType.ThingsBoard) {
        this.pollingType = this.pollingWebApiType;
        if (!this.data.device.property.useMqtt) {
            this.data.device.property.useMqtt = true;
        }
    }
}
```

#### Paso 4.4: Modificar `device-map.component.ts`

**Agregar ThingsBoard a la lista de plugins:**

```typescript
ngOnInit() {
    // ... código existente ...
    this.plugins.push(DeviceType.ThingsBoard);  // ← AGREGAR
}
```

#### Paso 4.5: Registrar en `app.module.ts`

**Ubicación:** `/client/src/app/app.module.ts`

```typescript
import { TagPropertyEditThingsboardComponent } from './device/tag-property/tag-property-edit-thingsboard/tag-property-edit-thingsboard.component';

@NgModule({
    declarations: [
        // ... otros componentes ...
        TagPropertyEditThingsboardComponent,  // ← AGREGAR
    ],
    // ...
})
```

---

## API de ThingsBoard

### Autenticación

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "tenant@thingsboard.org",
  "password": "tenant"
}

Response:
{
  "token": "eyJhbGciOiJIUzUxMiJ9...",
  "refreshToken": "eyJhbGciOiJIUzUxMiJ9..."
}
```

### Gestión de Dispositivos

#### Listar Dispositivos
```http
GET /api/tenant/devices?pageSize=100&page=0
Authorization: Bearer {token}

Response:
{
  "data": [
    {
      "id": {
        "entityType": "DEVICE",
        "id": "784f394c-42b6-435a-983c-b7beff2784f9"
      },
      "name": "DHT11 Demo Device",
      "type": "default",
      "label": "Temperature Sensor"
    }
  ],
  "totalPages": 1,
  "totalElements": 1
}
```

#### Obtener Claves de Telemetría
```http
GET /api/plugins/telemetry/DEVICE/{deviceId}/keys/timeseries
Authorization: Bearer {token}

Response:
[
  "temperature",
  "humidity",
  "pressure"
]
```

#### Leer Valores de Telemetría
```http
GET /api/plugins/telemetry/DEVICE/{deviceId}/values/timeseries?keys=temperature,humidity
Authorization: Bearer {token}

Response:
{
  "temperature": [
    {
      "ts": 1633024800000,
      "value": "22.5"
    }
  ],
  "humidity": [
    {
      "ts": 1633024800000,
      "value": "65"
    }
  ]
}
```

### Escritura de Datos

#### Escribir Atributos Compartidos
```http
POST /api/plugins/telemetry/DEVICE/{deviceId}/attributes/SHARED_SCOPE
Authorization: Bearer {token}
Content-Type: application/json

{
  "targetTemperature": 25
}
```

#### Ejecutar Comando RPC
```http
POST /api/plugins/rpc/twoway/{deviceId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "method": "setValue",
  "params": {
    "pin": 7,
    "value": 1
  },
  "timeout": 5000
}
```

### MQTT Gateway API

#### Conectar Gateway
```
Topic: v1/gateway/connect
Payload: {"device": "Device A"}
```

#### Recibir Telemetría
```
Topic: v1/gateway/telemetry
Payload: {
  "Device A": [
    {
      "ts": 1483228800000,
      "values": {
        "temperature": 42,
        "humidity": 80
      }
    }
  ]
}
```

---

## Funcionamiento de la Integración

### Escenario 1: Configuración Inicial

```
1. Usuario crea nuevo dispositivo en FUXA
   └─> Selecciona tipo "ThingsBoard"

2. Usuario configura conexión
   ├─> URL: http://thingsboard:8080
   ├─> Username: tenant@thingsboard.org
   └─> Password: ********

3. FUXA Backend intenta conectar
   ├─> POST /api/auth/login
   ├─> Obtiene JWT token
   ├─> Conecta cliente MQTT (si está habilitado)
   └─> Emite evento 'connect-ok'

4. Frontend muestra estado "Conectado"
```

### Escenario 2: Auto-Descubrimiento de Dispositivos

```
1. Usuario hace clic en "Browse" o "Add Tags"
   
2. FUXA Backend ejecuta browse()
   ├─> GET /api/tenant/devices
   └─> Obtiene lista de dispositivos TB

3. Para cada dispositivo:
   ├─> GET /api/plugins/telemetry/DEVICE/{id}/keys/timeseries
   └─> Obtiene claves de telemetría

4. Frontend muestra árbol de dispositivos
   ├─> 📁 DHT11 Demo Device
   │   ├─> 🏷️ temperature
   │   ├─> 🏷️ humidity
   │   └─> 🏷️ pressure
   └─> 📁 Smart Thermostat
       ├─> 🏷️ currentTemp
       └─> 🏷️ targetTemp

5. Usuario selecciona tags deseados
   └─> FUXA crea tags automáticamente
```

### Escenario 3: Lectura de Datos en Tiempo Real

```
┌─────────────────────────────────────────────────────────┐
│ Opción A: Con MQTT (Recomendado)                        │
└─────────────────────────────────────────────────────────┘

1. Dispositivo IoT publica telemetría a ThingsBoard
   └─> MQTT: v1/devices/me/telemetry

2. ThingsBoard procesa y reenvía a gateway
   └─> MQTT: v1/gateway/telemetry

3. FUXA recibe mensaje MQTT
   ├─> Parsea JSON
   ├─> Actualiza valores de tags
   └─> Emite evento 'device-value:changed'

4. Frontend actualiza visualización
   └─> Actualización en tiempo real (< 100ms)

┌─────────────────────────────────────────────────────────┐
│ Opción B: Con Polling REST API                          │
└─────────────────────────────────────────────────────────┘

1. Timer de polling ejecuta (cada 1-5 segundos)
   
2. FUXA ejecuta polling()
   └─> GET /api/plugins/telemetry/DEVICE/{id}/values/timeseries

3. Compara valores nuevos vs anteriores
   ├─> Si cambió: emite evento
   └─> Si no cambió: ignora

4. Frontend actualiza visualización
   └─> Actualización periódica (1-5 segundos)
```

### Escenario 4: Escritura de Datos

```
1. Usuario interactúa con control en HMI
   └─> Ejemplo: Cambia setpoint de temperatura a 25°C

2. Frontend ejecuta setValue()
   └─> Socket.IO: { tagId: "tb_device1_targetTemp", value: 25 }

3. FUXA Backend recibe comando
   └─> Identifica que es tag de ThingsBoard

4. Driver ejecuta setValue()
   ├─> Opción A: POST /api/plugins/telemetry/.../attributes/SHARED_SCOPE
   └─> Opción B: POST /api/plugins/rpc/twoway/{deviceId}

5. ThingsBoard procesa y envía a dispositivo
   └─> Dispositivo actualiza valor

6. Dispositivo confirma con nueva telemetría
   └─> FUXA recibe confirmación vía MQTT
```

### Escenario 5: Manejo de Errores

```
┌─────────────────────────────────────────────────────────┐
│ Error: Token JWT Expirado                               │
└─────────────────────────────────────────────────────────┘

1. Request falla con 401 Unauthorized
2. Driver detecta token expirado
3. Ejecuta refresh automático
   └─> POST /api/auth/login
4. Reintenta request original
5. Continúa operación normal

┌─────────────────────────────────────────────────────────┐
│ Error: Conexión MQTT Perdida                            │
└─────────────────────────────────────────────────────────┘

1. Cliente MQTT detecta desconexión
2. Emite evento 'connection_lost'
3. Inicia reconexión automática (backoff exponencial)
4. Reestablece suscripciones
5. Emite 'connect-ok' cuando reconecta

┌─────────────────────────────────────────────────────────┐
│ Error: Dispositivo No Encontrado                        │
└─────────────────────────────────────────────────────────┘

1. Request falla con 404 Not Found
2. Driver marca tag como 'unavailable'
3. Frontend muestra indicador de error
4. Continúa intentando en próximo polling
```

---

## Testing y Validación

### Test 1: Conexión Básica

```javascript
// Verificar que el driver se conecta correctamente
async function testConnection() {
    const driver = ThingsBoardClient.create({
        id: 'test-tb',
        name: 'Test ThingsBoard',
        type: 'ThingsBoard',
        property: {
            serverUrl: 'http://localhost:8080',
            username: 'tenant@thingsboard.org',
            password: 'tenant'
        }
    }, logger, events, runtime);
    
    await driver.connect();
    assert(driver.isConnected() === true);
    await driver.disconnect();
}
```

### Test 2: Auto-Descubrimiento

```javascript
// Verificar que browse() retorna dispositivos
async function testBrowse() {
    await driver.connect();
    const devices = await driver.browse('/');
    
    assert(devices.length > 0);
    assert(devices[0].name !== undefined);
    assert(devices[0].id !== undefined);
}
```

### Test 3: Lectura de Telemetría

```javascript
// Verificar que se leen valores correctamente
async function testReadTelemetry() {
    await driver.connect();
    await driver.load({
        tags: {
            'temp1': {
                id: 'temp1',
                address: 'deviceId:temperature',
                type: 'Real'
            }
        }
    });
    
    // Esperar polling
    await sleep(2000);
    
    const value = driver.getValue('temp1');
    assert(value !== null);
    assert(value.value !== undefined);
}
```

### Test 4: Escritura de Atributos

```javascript
// Verificar que se escriben valores correctamente
async function testWriteAttribute() {
    await driver.connect();
    const result = await driver.setValue('targetTemp', 25);
    
    assert(result === true);
    
    // Verificar que el valor se actualizó en ThingsBoard
    await sleep(1000);
    const value = driver.getValue('targetTemp');
    assert(value.value === 25);
}
```

### Checklist de Validación

- [ ] Driver se registra correctamente en FUXA
- [ ] Aparece en lista de tipos de dispositivos
- [ ] Formulario de configuración funciona
- [ ] Conexión a ThingsBoard exitosa
- [ ] Auto-descubrimiento lista dispositivos
- [ ] Tags se crean automáticamente
- [ ] Lectura de telemetría funciona (MQTT)
- [ ] Lectura de telemetría funciona (REST)
- [ ] Escritura de atributos funciona
- [ ] Comandos RPC funcionan
- [ ] Reconexión automática funciona
- [ ] Manejo de errores correcto
- [ ] DAQ guarda valores históricos
- [ ] Performance aceptable (< 100ms latencia)

---

## Anexos

### Anexo A: Estructura Completa del Código

Ver archivos de implementación en:
- `/home/jsalazar/FUXA/THINGSBOARD_DRIVER_IMPLEMENTATION/`

### Anexo B: Configuración de ThingsBoard

Para probar el driver, configura ThingsBoard:

1. Instalar ThingsBoard:
```bash
docker run -it -p 8080:9090 -p 1883:1883 \
  -e TB_QUEUE_TYPE=in-memory \
  thingsboard/tb-postgres
```

2. Crear dispositivo de prueba:
   - Login: http://localhost:8080
   - Devices → Add Device
   - Name: "Test Device"
   - Device Profile: "default"

3. Generar telemetría de prueba:
```bash
curl -X POST http://localhost:8080/api/v1/{ACCESS_TOKEN}/telemetry \
  -H "Content-Type: application/json" \
  -d '{"temperature":22.5,"humidity":65}'
```

### Anexo C: Troubleshooting

**Problema: "Cannot find module './thingsboard'"**
- Verificar que el directorio existe
- Verificar que index.js tiene module.exports

**Problema: "401 Unauthorized"**
- Verificar credenciales
- Verificar que token no expiró
- Verificar URL del servidor

**Problema: "MQTT connection refused"**
- Verificar puerto MQTT (1883)
- Verificar firewall
- Verificar que useMqtt está habilitado

### Anexo D: Referencias

- **FUXA GitHub**: https://github.com/frangoteam/FUXA
- **ThingsBoard Docs**: https://thingsboard.io/docs/
- **ThingsBoard REST API**: https://thingsboard.io/docs/reference/rest-api/
- **ThingsBoard MQTT API**: https://thingsboard.io/docs/reference/mqtt-api/
- **MQTT.js**: https://github.com/mqttjs/MQTT.js

---

## Resumen Ejecutivo

### Tiempo Estimado de Desarrollo

| Fase | Tiempo | Complejidad |
|------|--------|-------------|
| Backend - Estructura base | 4-6 horas | Media |
| Backend - REST Client | 3-4 horas | Media |
| Backend - MQTT Client | 3-4 horas | Media |
| Backend - Device Mapper | 2-3 horas | Baja |
| Frontend - Modelos | 1 hora | Baja |
| Frontend - Componentes | 4-6 horas | Media |
| Testing | 4-6 horas | Media |
| Documentación | 2-3 horas | Baja |
| **TOTAL** | **23-33 horas** | **Media** |

### Próximos Pasos

1. ✅ Revisar esta documentación
2. ⏭️ Crear estructura de directorios
3. ⏭️ Implementar backend (REST + MQTT)
4. ⏭️ Implementar frontend (componentes)
5. ⏭️ Testing con ThingsBoard real
6. ⏭️ Optimización y refinamiento
7. ⏭️ Documentación de usuario final

---

**Documento creado**: 2025-10-06  
**Versión**: 1.0  
**Autor**: Análisis del proyecto FUXA para integración ThingsBoard
