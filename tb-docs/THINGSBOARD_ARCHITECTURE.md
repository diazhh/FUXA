# ThingsBoard Driver - Arquitectura y Flujo de Datos

## Diagrama de Arquitectura General

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FUXA Application                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────┐         ┌─────────────────────────┐   │
│  │   Frontend (Angular)    │         │   Backend (Node.js)     │   │
│  │                         │         │                         │   │
│  │  ┌──────────────────┐  │         │  ┌──────────────────┐  │   │
│  │  │  Device Manager  │  │◄────────┤  │  Device Manager  │  │   │
│  │  │  Component       │  │  HTTP   │  │  (index.js)      │  │   │
│  │  └──────────────────┘  │         │  └──────────────────┘  │   │
│  │           │             │         │           │             │   │
│  │           ▼             │         │           ▼             │   │
│  │  ┌──────────────────┐  │         │  ┌──────────────────┐  │   │
│  │  │  ThingsBoard     │  │         │  │  Device Factory  │  │   │
│  │  │  Property Editor │  │         │  │  (device.js)     │  │   │
│  │  └──────────────────┘  │         │  └──────────────────┘  │   │
│  │           │             │         │           │             │   │
│  │           ▼             │         │           ▼             │   │
│  │  ┌──────────────────┐  │         │  ┌──────────────────┐  │   │
│  │  │  Tag Browser     │  │         │  │  ThingsBoard     │  │   │
│  │  │  Component       │  │         │  │  Client Driver   │  │   │
│  │  └──────────────────┘  │         │  │  (index.js)      │  │   │
│  │                         │         │  └──────────────────┘  │   │
│  │                         │         │    │            │       │   │
│  │                         │         │    ▼            ▼       │   │
│  │                         │         │  ┌──────┐  ┌────────┐  │   │
│  │                         │         │  │ REST │  │  MQTT  │  │   │
│  │                         │         │  │Client│  │ Client │  │   │
│  │                         │         │  └──────┘  └────────┘  │   │
│  └─────────────────────────┘         └─────────────────────────┘   │
│                                                │            │        │
└────────────────────────────────────────────────┼────────────┼────────┘
                                                 │            │
                                                 ▼            ▼
                                        ┌─────────────────────────┐
                                        │   ThingsBoard Server    │
                                        │                         │
                                        │  ┌──────────────────┐  │
                                        │  │   REST API       │  │
                                        │  │   Port 8080      │  │
                                        │  └──────────────────┘  │
                                        │  ┌──────────────────┐  │
                                        │  │   MQTT Broker    │  │
                                        │  │   Port 1883      │  │
                                        │  └──────────────────┘  │
                                        │  ┌──────────────────┐  │
                                        │  │   Devices        │  │
                                        │  │   Telemetry      │  │
                                        │  │   Attributes     │  │
                                        │  └──────────────────┘  │
                                        └─────────────────────────┘
```

## Flujo de Datos - Lectura de Telemetría

### Opción 1: Polling (REST API)

```
┌──────────┐                                    ┌──────────────┐
│  FUXA    │                                    │ ThingsBoard  │
│  Driver  │                                    │   Server     │
└────┬─────┘                                    └──────┬───────┘
     │                                                 │
     │ 1. polling() - cada 3-5 segundos               │
     ├────────────────────────────────────────────────►
     │                                                 │
     │ 2. GET /api/plugins/telemetry/DEVICE/{id}/     │
     │    values/timeseries?keys=temp,humidity        │
     ├────────────────────────────────────────────────►
     │                                                 │
     │ 3. Response: { temp: 25.5, humidity: 60 }      │
     ◄────────────────────────────────────────────────┤
     │                                                 │
     │ 4. _handleTelemetryUpdate()                    │
     │    - Actualizar varsValue                      │
     │    - Detectar cambios                          │
     │                                                 │
     │ 5. _emitValues()                               │
     │    - Emitir evento 'device-value:changed'      │
     │                                                 │
     │ 6. addDaq() - si DAQ habilitado                │
     │    - Guardar en base de datos                  │
     │                                                 │
```

### Opción 2: Tiempo Real (MQTT)

```
┌──────────┐                                    ┌──────────────┐
│  FUXA    │                                    │ ThingsBoard  │
│  Driver  │                                    │   Server     │
└────┬─────┘                                    └──────┬───────┘
     │                                                 │
     │ 1. connect() - al iniciar                      │
     │    - Conectar REST API                         │
     ├────────────────────────────────────────────────►
     │                                                 │
     │ 2. Conectar MQTT                               │
     │    - Topic: v1/gateway/telemetry               │
     ├────────────────────────────────────────────────►
     │                                                 │
     │ 3. Suscribirse a dispositivos                  │
     ├────────────────────────────────────────────────►
     │                                                 │
     │                                                 │
     │ 4. Dispositivo envía telemetría ───────────────►
     │                                                 │
     │ 5. MQTT Publish                                │
     │    { deviceName: [{ ts, values }] }            │
     ◄────────────────────────────────────────────────┤
     │                                                 │
     │ 6. on('telemetry') event                       │
     │    - _handleTelemetryUpdate()                  │
     │    - Actualizar varsValue                      │
     │    - Emitir eventos                            │
     │                                                 │
```

## Flujo de Datos - Escritura de Valores

### Opción 1: Atributo Compartido

```
┌──────────┐                                    ┌──────────────┐
│  FUXA    │                                    │ ThingsBoard  │
│  Driver  │                                    │   Server     │
└────┬─────┘                                    └──────┬───────┘
     │                                                 │
     │ 1. setValue(tagId, value)                      │
     │    - Usuario cambia valor en UI                │
     │                                                 │
     │ 2. Calcular valor con scaling                  │
     │    - deviceUtils.tagRawCalculator()            │
     │                                                 │
     │ 3. POST /api/plugins/telemetry/DEVICE/{id}/    │
     │    attributes/SHARED_SCOPE                     │
     │    Body: { "key": value }                      │
     ├────────────────────────────────────────────────►
     │                                                 │
     │ 4. Response: 200 OK                            │
     ◄────────────────────────────────────────────────┤
     │                                                 │
     │ 5. Actualizar varsValue local                  │
     │                                                 │
     │                                                 │
     │ 6. Dispositivo lee atributo ◄──────────────────┤
     │                                                 │
```

### Opción 2: Comando RPC

```
┌──────────┐                                    ┌──────────────┐
│  FUXA    │                                    │ ThingsBoard  │
│  Driver  │                                    │   Server     │
└────┬─────┘                                    └──────┬───────┘
     │                                                 │
     │ 1. setValue(tagId, value)                      │
     │    - options.writeType === 'rpc'               │
     │                                                 │
     │ 2. POST /api/plugins/rpc/twoway/{deviceId}     │
     │    Body: {                                     │
     │      method: "setValue",                       │
     │      params: { key: value },                   │
     │      timeout: 5000                             │
     │    }                                           │
     ├────────────────────────────────────────────────►
     │                                                 │
     │ 3. Enviar comando a dispositivo ───────────────►
     │                                                 │
     │ 4. Dispositivo ejecuta comando                 │
     │                                                 │
     │ 5. Respuesta del dispositivo ◄─────────────────┤
     │                                                 │
     │ 6. Response: { result: "ok" }                  │
     ◄────────────────────────────────────────────────┤
     │                                                 │
```

## Flujo de Auto-descubrimiento

```
┌──────────┐                                    ┌──────────────┐
│  FUXA    │                                    │ ThingsBoard  │
│  UI      │                                    │   Server     │
└────┬─────┘                                    └──────┬───────┘
     │                                                 │
     │ 1. Usuario click "Browse"                      │
     │                                                 │
     │ 2. askDeviceBrowse(deviceId, '')               │
     │    ↓                                           │
     │ 3. Driver.browse('')                           │
     │    - Listar dispositivos                       │
     ├────────────────────────────────────────────────►
     │                                                 │
     │ 4. GET /api/tenant/devices                     │
     ├────────────────────────────────────────────────►
     │                                                 │
     │ 5. Response: [{ id, name, type, label }]      │
     ◄────────────────────────────────────────────────┤
     │                                                 │
     │ 6. Mapear a formato FUXA                       │
     │    - TBDeviceMapper.mapDevices()               │
     │                                                 │
     │ 7. Mostrar lista de dispositivos               │
     │                                                 │
     │ 8. Usuario selecciona dispositivo              │
     │                                                 │
     │ 9. askDeviceBrowse(deviceId, 'device-id')      │
     │    ↓                                           │
     │ 10. Driver.browse('device-id')                 │
     │     - Listar telemetría                        │
     ├────────────────────────────────────────────────►
     │                                                 │
     │ 11. GET /api/plugins/telemetry/DEVICE/         │
     │     {deviceId}/keys/timeseries                 │
     ├────────────────────────────────────────────────►
     │                                                 │
     │ 12. Response: ["temperature", "humidity"]      │
     ◄────────────────────────────────────────────────┤
     │                                                 │
     │ 13. Mapear a tags FUXA                         │
     │     - address: "deviceId:key"                  │
     │     - type: inferido                           │
     │                                                 │
     │ 14. Mostrar tabla de telemetría                │
     │                                                 │
     │ 15. Usuario selecciona keys                    │
     │                                                 │
     │ 16. Agregar tags al dispositivo                │
     │                                                 │
```

## Arquitectura de Componentes Backend

```
┌───────────────────────────────────────────────────────────────┐
│                    ThingsBoard Driver                         │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              index.js (Main Driver)                  │    │
│  │                                                      │    │
│  │  • connect() / disconnect()                         │    │
│  │  • polling()                                        │    │
│  │  • setValue() / getValue()                          │    │
│  │  • browse()                                         │    │
│  │  • load() / getStatus()                             │    │
│  │  • bindAddDaq()                                     │    │
│  │                                                      │    │
│  └──────┬───────────────────────┬───────────────┬──────┘    │
│         │                       │               │            │
│         ▼                       ▼               ▼            │
│  ┌─────────────┐      ┌──────────────┐  ┌──────────────┐   │
│  │ tb-rest-    │      │ tb-mqtt-     │  │ tb-device-   │   │
│  │ client.js   │      │ client.js    │  │ mapper.js    │   │
│  │             │      │              │  │              │   │
│  │ • login()   │      │ • connect()  │  │ • mapDevice()│   │
│  │ • getDevices│      │ • subscribe()│  │ • mapTag()   │   │
│  │ • getTelem  │      │ • publish()  │  │ • inferType()│   │
│  │ • writeAttr │      │ • on('msg')  │  │ • parseAddr()│   │
│  │ • sendRpc() │      │              │  │              │   │
│  └─────────────┘      └──────────────┘  └──────────────┘   │
│         │                     │                             │
└─────────┼─────────────────────┼─────────────────────────────┘
          │                     │
          ▼                     ▼
    ┌──────────┐          ┌──────────┐
    │  axios   │          │   mqtt   │
    │ (HTTP)   │          │  (MQTT)  │
    └──────────┘          └──────────┘
```

## Arquitectura de Componentes Frontend

```
┌───────────────────────────────────────────────────────────────┐
│                    Device Management UI                       │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         device.component.ts (Main Container)         │    │
│  │                                                      │    │
│  │  • Gestión de vista (map/list/tags)                 │    │
│  │  • Eventos de dispositivos                          │    │
│  │  • Import/Export                                    │    │
│  │                                                      │    │
│  └──────┬───────────────────────┬───────────────┬──────┘    │
│         │                       │               │            │
│         ▼                       ▼               ▼            │
│  ┌─────────────┐      ┌──────────────┐  ┌──────────────┐   │
│  │ device-map  │      │ device-list  │  │ device-      │   │
│  │ component   │      │ component    │  │ property     │   │
│  │             │      │              │  │ component    │   │
│  │ • Mapa de   │      │ • Lista tags │  │              │   │
│  │   dispositivos    │ • Valores    │  │ • Formulario │   │
│  │ • Status    │      │ • Edición    │  │   config     │   │
│  └─────────────┘      └──────────────┘  │ • Test conn  │   │
│                                          └──────────────┘   │
│                                                  │            │
│                                                  ▼            │
│                              ┌──────────────────────────┐    │
│                              │ device-property-         │    │
│                              │ thingsboard.component    │    │
│                              │                          │    │
│                              │ • serverUrl              │    │
│                              │ • username/password      │    │
│                              │ • useMqtt                │    │
│                              │ • Test connection        │    │
│                              └──────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         tag-property.component (Tag Editor)          │    │
│  │                                                      │    │
│  │  • Edición de tags                                  │    │
│  │  • Propiedades específicas por tipo                 │    │
│  │                                                      │    │
│  └──────────────────────────┬───────────────────────────┘    │
│                             │                                │
│                             ▼                                │
│              ┌──────────────────────────────┐               │
│              │ tag-property-edit-           │               │
│              │ thingsboard.component        │               │
│              │                              │               │
│              │ • Browse devices             │               │
│              │ • Browse telemetry           │               │
│              │ • Select multiple keys       │               │
│              │ • Configure tag type         │               │
│              └──────────────────────────────┘               │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

## Ciclo de Vida del Driver

```
┌─────────────────────────────────────────────────────────────┐
│                    Device Lifecycle                         │
└─────────────────────────────────────────────────────────────┘

    INIT
     │
     │ 1. Device.create()
     │    - Crear instancia del driver
     │    - Cargar configuración
     ▼
    IDLE
     │
     │ 2. device.start()
     │    - Iniciar timers
     │    - checkStatus cada 5s
     ▼
  CONNECTING
     │
     │ 3. driver.connect()
     │    - Autenticar REST
     │    - Conectar MQTT (opcional)
     │    - Restaurar valores (DAQ)
     ▼
  CONNECTED
     │
     │ 4. Polling Loop (cada 3-5s)
     │    ├─► driver.polling()
     │    │   ├─► Leer telemetría
     │    │   ├─► Actualizar valores
     │    │   ├─► Emitir eventos
     │    │   └─► Guardar DAQ
     │    │
     │    └─► checkStatus()
     │        ├─► Verificar timestamp
     │        ├─► Actualizar connectionStatus
     │        └─► Emitir status
     │
     │ 5. Eventos externos
     │    ├─► setValue() - Escritura
     │    ├─► browse() - Exploración
     │    └─► getValue() - Lectura
     │
     │ 6. device.stop()
     │    - Detener timers
     │    - Desconectar MQTT
     │    - Limpiar recursos
     ▼
   STOPPED
```

## Gestión de Estado de Conexión

```
┌──────────────────────────────────────────────────────────────┐
│                  Connection Status Management                 │
└──────────────────────────────────────────────────────────────┘

ConnectionStatus:
  • OFF (0)      - Desconectado
  • WARNING (3)  - Sin respuesta > 2x polling
  • ON (5)       - Conectado y funcionando

┌─────────────────────────────────────────────────────────┐
│                                                         │
│  lastReadTimestamp                                      │
│         │                                               │
│         ▼                                               │
│  ┌──────────────────────────────────────────────┐      │
│  │  now - lastRead < pollingInterval * 2        │      │
│  │              ↓ YES                           │      │
│  │         Status = ON                          │      │
│  └──────────────────────────────────────────────┘      │
│         │ NO                                            │
│         ▼                                               │
│  ┌──────────────────────────────────────────────┐      │
│  │  now - lastRead < pollingInterval * 5        │      │
│  │              ↓ YES                           │      │
│  │         Status = WARNING                     │      │
│  └──────────────────────────────────────────────┘      │
│         │ NO                                            │
│         ▼                                               │
│  ┌──────────────────────────────────────────────┐      │
│  │         Status = OFF                         │      │
│  └──────────────────────────────────────────────┘      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Gestión de Tokens JWT

```
┌──────────────────────────────────────────────────────────────┐
│                    JWT Token Management                       │
└──────────────────────────────────────────────────────────────┘

1. Login Inicial
   ┌──────────────────────────────────────┐
   │ POST /api/auth/login                 │
   │ Body: { username, password }         │
   └──────────────────┬───────────────────┘
                      │
                      ▼
   ┌──────────────────────────────────────┐
   │ Response:                            │
   │ {                                    │
   │   token: "eyJhbGc...",              │
   │   refreshToken: "eyJhbGc..."        │
   │ }                                    │
   └──────────────────┬───────────────────┘
                      │
                      ▼
   ┌──────────────────────────────────────┐
   │ Guardar tokens                       │
   │ - this.token = token                 │
   │ - this.refreshToken = refreshToken   │
   └──────────────────────────────────────┘

2. Request con Token
   ┌──────────────────────────────────────┐
   │ GET /api/tenant/devices              │
   │ Header: X-Authorization: Bearer ...  │
   └──────────────────┬───────────────────┘
                      │
                      ▼
   ┌──────────────────────────────────────┐
   │ Response: 200 OK                     │
   └──────────────────────────────────────┘

3. Token Expirado
   ┌──────────────────────────────────────┐
   │ GET /api/tenant/devices              │
   │ Header: X-Authorization: Bearer ...  │
   └──────────────────┬───────────────────┘
                      │
                      ▼
   ┌──────────────────────────────────────┐
   │ Response: 401 Unauthorized           │
   └──────────────────┬───────────────────┘
                      │
                      ▼
   ┌──────────────────────────────────────┐
   │ Interceptor detecta 401              │
   │ - Llamar refreshJwtToken()           │
   └──────────────────┬───────────────────┘
                      │
                      ▼
   ┌──────────────────────────────────────┐
   │ POST /api/auth/token                 │
   │ Body: { refreshToken }               │
   └──────────────────┬───────────────────┘
                      │
                      ▼
   ┌──────────────────────────────────────┐
   │ Response: { token, refreshToken }    │
   │ - Actualizar tokens                  │
   │ - Reintentar request original        │
   └──────────────────────────────────────┘
```

## Integración con DAQ (Data Acquisition)

```
┌──────────────────────────────────────────────────────────────┐
│                    DAQ Integration Flow                       │
└──────────────────────────────────────────────────────────────┘

1. Configuración
   ┌──────────────────────────────────────┐
   │ Tag Configuration:                   │
   │ {                                    │
   │   daq: {                             │
   │     enabled: true,                   │
   │     interval: 60,    // segundos     │
   │     changed: true,   // solo cambios │
   │     restored: false  // restaurar    │
   │   }                                  │
   │ }                                    │
   └──────────────────────────────────────┘

2. Inicialización
   ┌──────────────────────────────────────┐
   │ devices.loadDevice(device)           │
   │   ↓                                  │
   │ daqStorage.addDaqNode()              │
   │   ↓                                  │
   │ device.bindSaveDaqValue(fnc)         │
   │   ↓                                  │
   │ driver.addDaq = fnc                  │
   └──────────────────────────────────────┘

3. Guardado de Datos
   ┌──────────────────────────────────────┐
   │ driver.polling()                     │
   │   ↓                                  │
   │ _checkVarsChanged()                  │
   │   ├─► Verificar si cambió           │
   │   ├─► Verificar intervalo           │
   │   └─► Agregar a result               │
   │   ↓                                  │
   │ driver.addDaq(varsChanged)           │
   │   ↓                                  │
   │ daqStorage.save()                    │
   │   ↓                                  │
   │ Base de datos (SQLite/InfluxDB)      │
   └──────────────────────────────────────┘

4. Restauración de Valores
   ┌──────────────────────────────────────┐
   │ device.connect()                     │
   │   ↓                                  │
   │ restoreValues()                      │
   │   ↓                                  │
   │ getDaqValueToRestore(deviceId)       │
   │   ↓                                  │
   │ daqStorage.getLastValues()           │
   │   ↓                                  │
   │ Para cada valor:                     │
   │   driver.setValue(tagId, value)      │
   └──────────────────────────────────────┘
```

---

**Versión**: 1.0  
**Fecha**: 2025-10-07  
**Autor**: Documentación de arquitectura ThingsBoard-FUXA
