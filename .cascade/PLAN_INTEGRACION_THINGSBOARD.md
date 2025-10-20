# Plan de Integración Directa FUXA - ThingsBoard

## 1. Análisis de Arquitectura Actual

### 1.1 Estructura Actual de FUXA

#### Backend (Server)
- **Device Manager** (`/server/runtime/devices/index.js`): Gestiona todos los dispositivos configurados
- **Device Interface** (`/server/runtime/devices/device.js`): Interfaz para diferentes tipos de dispositivos (S7, OPCUA, Modbus, etc.)
- **Project Manager** (`/server/runtime/project/index.js`): Gestiona la configuración del proyecto
- **Project Storage** (`/server/runtime/project/prjstorage.js`): Almacenamiento en SQLite de devices, tags y configuración
- **Runtime** (`/server/runtime/index.js`): Gestión de comunicación en tiempo real con Socket.IO

#### Base de Datos (SQLite)
Tablas actuales:
- `devices`: Almacena configuración de dispositivos y sus tags
- `general`: Configuración general del proyecto
- `views`: Vistas HMI
- `devicesSecurity`: Credenciales de dispositivos
- Otras: `texts`, `alarms`, `notifications`, `scripts`, `reports`, `locations`

#### Frontend (Client)
- **Device Component** (`/client/src/app/device/`): UI para gestión de dispositivos
- **Device List**: Lista de dispositivos
- **Device Property**: Propiedades de dispositivos
- **Tag Property**: Configuración de tags

### 1.2 Flujo Actual de Datos

```
[SQLite DB] → [Project Manager] → [Device Manager] → [Device Instances] → [Polling/Reading]
                                                                                  ↓
                          [Frontend] ← [Socket.IO] ← [Runtime] ← [Events] ← [Device Values]
```

### 1.3 Tipos de Dispositivos Soportados

```javascript
DeviceEnum = {
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
    WebCam: 'WebCam',
    MELSEC: 'MELSEC'
}
```

## 2. Arquitectura Propuesta con ThingsBoard

### 2.1 Nuevo Flujo de Datos

```
[ThingsBoard API] → [TB Client Service] → [Device Manager] → [Virtual TB Devices]
                                              ↓
                                         [Tag Sync]
                                              ↓
[Frontend] ← [Socket.IO] ← [Runtime] ← [Real-time Telemetry]
```

### 2.2 Componentes Nuevos a Crear

#### A. ThingsBoard Client Service
**Ubicación**: `/server/runtime/thingsboard/tb-client.js`

**Responsabilidades**:
- Autenticación con ThingsBoard REST API
- Conexión WebSocket para telemetría en tiempo real
- Obtener lista de devices
- Obtener telemetría de devices
- Suscripción a cambios en tiempo real
- Manejo de reconexión automática

**API ThingsBoard a utilizar**:
- `POST /api/auth/login` - Autenticación
- `GET /api/tenant/devices` - Lista de devices
- `GET /api/plugins/telemetry/DEVICE/{deviceId}/keys/timeseries` - Keys de telemetría
- `GET /api/plugins/telemetry/DEVICE/{deviceId}/values/timeseries` - Valores de telemetría
- WebSocket `/api/ws` - Suscripción en tiempo real

#### B. ThingsBoard Device Adapter
**Ubicación**: `/server/runtime/devices/thingsboard.js`

**Responsabilidades**:
- Implementar interfaz de Device compatible con FUXA
- Mapear devices de ThingsBoard a formato FUXA
- Mapear telemetría a tags de FUXA
- Sincronización bidireccional de valores
- Polling de telemetría (si no hay WebSocket)

#### C. ThingsBoard Sync Service
**Ubicación**: `/server/runtime/thingsboard/tb-sync.js`

**Responsabilidades**:
- Sincronización periódica de devices
- Detección de nuevos devices
- Detección de devices eliminados
- Sincronización de telemetría keys como tags
- Cache de datos para rendimiento

#### D. ThingsBoard Configuration Manager
**Ubicación**: `/server/runtime/thingsboard/tb-config.js`

**Responsabilidades**:
- Gestión de credenciales ThingsBoard
- Configuración de URL del servidor
- Configuración de intervalo de sincronización
- Almacenamiento seguro de credenciales

### 2.3 Modificaciones a Componentes Existentes

#### A. Device Manager (`/server/runtime/devices/index.js`)
**Cambios**:
- Agregar soporte para devices virtuales de ThingsBoard
- No cargar devices de ThingsBoard desde SQLite
- Obtener devices de ThingsBoard desde TB Sync Service
- Mantener compatibilidad con otros tipos de devices

#### B. Project Storage (`/server/runtime/project/prjstorage.js`)
**Cambios**:
- Agregar tabla `thingsboardConfig` para credenciales
- No almacenar devices/tags de ThingsBoard en tabla `devices`
- Mantener almacenamiento de otros tipos de devices

#### C. Project Manager (`/server/runtime/project/index.js`)
**Cambios**:
- Separar devices locales de devices ThingsBoard
- Método `getDevices()` debe combinar ambas fuentes
- Método `getDevice()` debe buscar en ambas fuentes
- No permitir edición de devices ThingsBoard desde FUXA

#### D. Runtime (`/server/runtime/index.js`)
**Cambios**:
- Inicializar ThingsBoard Client Service
- Emitir eventos de sincronización de devices
- Propagar cambios de telemetría en tiempo real

#### E. API Endpoints (`/server/api/projects/index.js`)
**Cambios**:
- `GET /api/device` - Incluir devices de ThingsBoard
- `POST /api/device` - Rechazar modificación de devices ThingsBoard
- Nuevos endpoints:
  - `GET /api/thingsboard/devices` - Lista de devices TB
  - `GET /api/thingsboard/config` - Configuración TB
  - `POST /api/thingsboard/config` - Actualizar configuración TB
  - `GET /api/thingsboard/status` - Estado de conexión TB

## 3. Estructura de Datos

### 3.1 Configuración ThingsBoard

```javascript
{
  "thingsboard": {
    "enabled": true,
    "url": "https://thingsboard.cloud",
    "username": "tenant@thingsboard.org",
    "password": "encrypted_password",
    "syncInterval": 30000, // ms
    "useWebSocket": true,
    "deviceFilter": {
      "type": null, // null = todos
      "label": null
    }
  }
}
```

### 3.2 Device de ThingsBoard en FUXA

```javascript
{
  "id": "tb_<thingsboard_device_id>",
  "name": "<device_name_from_tb>",
  "type": "ThingsBoard",
  "enabled": true,
  "readonly": true, // No editable desde FUXA
  "source": "thingsboard",
  "property": {
    "deviceId": "<thingsboard_device_id>",
    "deviceType": "<device_type>",
    "label": "<device_label>"
  },
  "tags": {
    // Generados dinámicamente desde telemetría
  }
}
```

### 3.3 Tag de Telemetría como Tag FUXA

```javascript
{
  "id": "tb_<device_id>_<telemetry_key>",
  "name": "<telemetry_key>",
  "address": "<telemetry_key>",
  "type": "number|string|boolean", // Inferido del valor
  "readonly": false, // Puede ser modificable si TB lo permite
  "value": "<current_value>",
  "timestamp": "<last_update_timestamp>"
}
```

## 4. Plan de Implementación Detallado

### Fase 1: Infraestructura Base (Días 1-3)

#### 1.1 Crear ThingsBoard Client Service
- [ ] Implementar autenticación REST API
- [ ] Implementar métodos para obtener devices
- [ ] Implementar métodos para obtener telemetría
- [ ] Implementar WebSocket para tiempo real
- [ ] Implementar manejo de errores y reconexión
- [ ] Agregar logging detallado

#### 1.2 Crear Configuration Manager
- [ ] Definir esquema de configuración
- [ ] Implementar almacenamiento en SQLite
- [ ] Implementar encriptación de credenciales
- [ ] Crear API para gestión de configuración

#### 1.3 Agregar Dependencias
```json
{
  "dependencies": {
    "@thingsboard/rest-api-client": "^3.0.0",
    "ws": "^8.18.0" // Ya existe
  }
}
```

### Fase 2: Device Adapter (Días 4-6)

#### 2.1 Crear ThingsBoard Device Adapter
- [ ] Implementar interfaz Device de FUXA
- [ ] Mapear devices de TB a formato FUXA
- [ ] Implementar métodos: connect, disconnect, polling
- [ ] Implementar getValue, setValue para tags
- [ ] Implementar getValues para todos los tags
- [ ] Implementar browse para explorar telemetría

#### 2.2 Integrar con Device Manager
- [ ] Agregar ThingsBoard a DeviceEnum
- [ ] Modificar Device.create() para soportar TB
- [ ] Implementar carga de devices TB en load()
- [ ] Mantener separación de devices locales vs TB

### Fase 3: Sincronización (Días 7-9)

#### 3.1 Crear Sync Service
- [ ] Implementar sincronización inicial de devices
- [ ] Implementar sincronización periódica
- [ ] Implementar detección de cambios
- [ ] Implementar cache de devices/telemetría
- [ ] Implementar eventos de sincronización

#### 3.2 Integrar con Project Manager
- [ ] Modificar getDevices() para incluir TB
- [ ] Modificar getDevice() para buscar en TB
- [ ] Implementar filtrado de devices TB
- [ ] Prevenir edición de devices TB

### Fase 4: API y Runtime (Días 10-12)

#### 4.1 Actualizar API Endpoints
- [ ] Modificar GET /api/device
- [ ] Modificar POST /api/device
- [ ] Crear GET /api/thingsboard/devices
- [ ] Crear GET /api/thingsboard/config
- [ ] Crear POST /api/thingsboard/config
- [ ] Crear GET /api/thingsboard/status

#### 4.2 Actualizar Runtime
- [ ] Inicializar TB Client en startup
- [ ] Propagar eventos de telemetría
- [ ] Implementar suscripción Socket.IO para TB
- [ ] Implementar heartbeat de conexión TB

### Fase 5: Frontend (Días 13-15)

#### 5.1 Actualizar Device Component
- [ ] Mostrar devices TB como readonly
- [ ] Indicador visual de origen (TB vs Local)
- [ ] Deshabilitar edición de devices TB
- [ ] Mostrar estado de sincronización

#### 5.2 Crear TB Configuration UI
- [ ] Formulario de configuración TB
- [ ] Validación de credenciales
- [ ] Test de conexión
- [ ] Indicador de estado de conexión

#### 5.3 Actualizar Tag Management
- [ ] Mostrar tags de telemetría TB
- [ ] Actualización en tiempo real
- [ ] Indicador de timestamp
- [ ] Filtrado por origen

### Fase 6: Testing y Documentación (Días 16-18)

#### 6.1 Testing
- [ ] Unit tests para TB Client
- [ ] Integration tests para Sync Service
- [ ] E2E tests para flujo completo
- [ ] Performance tests
- [ ] Stress tests de sincronización

#### 6.2 Documentación
- [ ] Guía de configuración TB
- [ ] Guía de migración
- [ ] API documentation
- [ ] Troubleshooting guide
- [ ] Actualizar README

## 5. Consideraciones Técnicas

### 5.1 Seguridad
- Encriptar credenciales de ThingsBoard en DB
- Usar HTTPS para comunicación con TB
- Validar tokens JWT de TB
- Implementar rate limiting

### 5.2 Rendimiento
- Cache de devices y telemetría
- Batch requests cuando sea posible
- WebSocket para tiempo real
- Lazy loading de telemetría histórica

### 5.3 Escalabilidad
- Paginación de devices si hay muchos
- Filtrado de devices por tipo/label
- Suscripción selectiva a telemetría
- Compresión de datos en WebSocket

### 5.4 Resiliencia
- Reconexión automática
- Queue de comandos durante desconexión
- Fallback a polling si WebSocket falla
- Manejo de timeouts

### 5.5 Compatibilidad
- Mantener soporte para devices locales
- No romper API existente
- Migración gradual
- Backward compatibility

## 6. Riesgos y Mitigaciones

### 6.1 Riesgos

| Riesgo | Impacto | Probabilidad | Mitigación |
|--------|---------|--------------|------------|
| API de TB cambia | Alto | Medio | Usar versión específica de API, tests de integración |
| Latencia de red | Medio | Alto | Cache, WebSocket, timeout configurables |
| Muchos devices | Alto | Medio | Paginación, filtrado, lazy loading |
| Pérdida de conexión | Alto | Medio | Reconexión automática, queue de comandos |
| Conflicto de IDs | Medio | Bajo | Prefijo "tb_" para devices TB |

### 6.2 Plan de Rollback
- Mantener código legacy
- Feature flag para habilitar/deshabilitar TB
- Backup de configuración
- Documentación de rollback

## 7. Métricas de Éxito

- [ ] 100% de devices TB sincronizados
- [ ] < 1s latencia de telemetría en tiempo real
- [ ] 0 pérdida de datos durante sincronización
- [ ] 99.9% uptime de conexión TB
- [ ] < 5s tiempo de reconexión
- [ ] Documentación completa

## 8. Próximos Pasos

1. **Revisar y aprobar este plan**
2. **Configurar entorno de desarrollo con ThingsBoard**
3. **Comenzar Fase 1: Infraestructura Base**
4. **Iteraciones semanales con demos**
5. **Testing continuo**
6. **Deployment gradual**

---

**Fecha de Creación**: 2025-10-16
**Versión**: 1.0
**Estado**: Pendiente de Aprobación
