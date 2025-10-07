# ThingsBoard Native Driver Integration - FUXA

## Resumen Ejecutivo

Este documento describe la integración nativa del driver ThingsBoard en FUXA, permitiendo la conexión directa con la plataforma IoT ThingsBoard para obtener telemetría de dispositivos y alimentar tags y elementos de FUXA en tiempo real.

**Estado Actual**: El driver ThingsBoard ya está implementado en el backend pero requiere integración completa en el frontend.

---

## Arquitectura Actual

### Backend (Servidor) - ✅ IMPLEMENTADO

La implementación del servidor está completa y funcional en `/server/runtime/devices/thingsboard/`:

#### Componentes Implementados:

1. **index.js** - Driver principal ThingsBoard
   - Gestión de conexión REST y MQTT
   - Autenticación JWT
   - Polling de telemetría
   - Escritura de atributos y comandos RPC
   - Función browse para auto-descubrimiento

2. **tb-rest-client.js** - Cliente REST API
   - Autenticación y refresh de tokens
   - Obtención de dispositivos
   - Lectura de telemetría (actual e histórica)
   - Escritura de atributos compartidos
   - Comandos RPC (one-way y two-way)
   - Búsqueda de dispositivos

3. **tb-mqtt-client.js** - Cliente MQTT
   - Conexión MQTT para telemetría en tiempo real
   - Suscripción a dispositivos
   - Manejo de mensajes gateway

4. **tb-device-mapper.js** - Mapeador de dispositivos
   - Conversión de dispositivos ThingsBoard a formato FUXA
   - Inferencia de tipos de datos
   - Generación de IDs únicos para tags

### Frontend (Cliente) - ⚠️ PARCIALMENTE IMPLEMENTADO

Existe un componente de edición de tags en:
`/client/src/app/device/tag-property/tag-property-edit-thingsboard/`

**Falta**: Integración completa en el sistema de dispositivos de FUXA.

---

## Funcionalidades Implementadas

### 1. Conexión y Autenticación
- ✅ Autenticación con usuario/contraseña
- ✅ Gestión automática de tokens JWT
- ✅ Refresh automático de tokens
- ✅ Conexión MQTT opcional para telemetría en tiempo real

### 2. Lectura de Datos
- ✅ Polling de telemetría vía REST API
- ✅ Telemetría en tiempo real vía MQTT
- ✅ Lectura de atributos (CLIENT_SCOPE, SHARED_SCOPE, SERVER_SCOPE)
- ✅ Historial de telemetría con rango de fechas

### 3. Escritura de Datos
- ✅ Escritura de atributos compartidos
- ✅ Comandos RPC two-way (con respuesta)
- ✅ Comandos RPC one-way (sin respuesta)
- ✅ Soporte para funciones de escalado

### 4. Auto-descubrimiento
- ✅ Listado de dispositivos del tenant
- ✅ Obtención de claves de telemetría por dispositivo
- ✅ Búsqueda de dispositivos por nombre
- ✅ Obtención de tipos de dispositivos

### 5. Integración con FUXA
- ✅ Sistema de tags compatible
- ✅ Integración con DAQ (Data Acquisition)
- ✅ Emisión de eventos de cambio de valores
- ✅ Gestión de estado de conexión
- ✅ Soporte para deadband y formato de valores

---

## Formato de Direcciones de Tags

Los tags de ThingsBoard utilizan el siguiente formato de dirección:

```
deviceId:telemetryKey
```

**Ejemplo**:
```
a1b2c3d4-5678-90ab-cdef-1234567890ab:temperature
a1b2c3d4-5678-90ab-cdef-1234567890ab:humidity
```

Donde:
- `deviceId`: ID único del dispositivo en ThingsBoard
- `telemetryKey`: Nombre de la clave de telemetría

---

## Configuración del Dispositivo

### Propiedades de Conexión

```javascript
{
  "serverUrl": "http://localhost:8080",  // URL del servidor ThingsBoard
  "username": "tenant@thingsboard.org",  // Usuario (email)
  "password": "tenant",                  // Contraseña
  "useMqtt": true                        // Usar MQTT para tiempo real (opcional)
}
```

### Configuración de Tags

```javascript
{
  "id": "tag_id",
  "name": "Temperature",
  "address": "deviceId:temperature",
  "type": "Real",                        // Bool, Byte, Int, Word, DInt, DWord, Real
  "divisor": 1,
  "format": 2,                           // Decimales
  "options": {
    "writeType": "attribute",            // "attribute" o "rpc"
    "rpcMethod": "setValue"              // Método RPC (si writeType es "rpc")
  },
  "daq": {
    "enabled": true,
    "interval": 60,
    "changed": true
  }
}
```

---

## Cambios Requeridos para Integración Completa

### 1. Backend - device.js ⚠️ REQUERIDO

**Archivo**: `/server/runtime/devices/device.js`

**Cambios necesarios**:

```javascript
// Línea 19: Agregar import
var ThingsBoardClient = require('./thingsboard');

// Línea 116: Agregar case para ThingsBoard
} else if (data.type === DeviceEnum.ThingsBoard) {
    if (!ThingsBoardClient) {
        return null;
    }
    comm = ThingsBoardClient.create(data, logger, events, manager, runtime);
}

// Línea 281: Agregar soporte para browse
} else if (data.type === DeviceEnum.ThingsBoard) {
    comm.browse(path, callback).then(function (result) {
        resolve(result);
    }).catch(function (err) {
        reject(err);
    });
}

// Línea 573: Agregar a DeviceEnum
var DeviceEnum = {
    // ... otros tipos
    ThingsBoard: 'ThingsBoard',
}
```

### 2. Frontend - device.ts ⚠️ REQUERIDO

**Archivo**: `/client/src/app/_models/device.ts`

**Cambios necesarios**:

```typescript
// Línea 248: Agregar a DeviceType enum
export enum DeviceType {
    // ... otros tipos
    ThingsBoard = 'ThingsBoard'
}
```

### 3. Frontend - Componentes UI 📋 PENDIENTE

**Archivos a crear/modificar**:

1. **device-property component** - Formulario de configuración del dispositivo
   - Campos: serverUrl, username, password, useMqtt
   - Validación de conexión
   - Botón "Test Connection"

2. **device-map component** - Agregar icono y soporte para ThingsBoard

3. **tag-property component** - Integrar el componente existente
   - Ya existe: `tag-property-edit-thingsboard`
   - Necesita: Registro en el módulo principal

4. **Módulos Angular** - Registrar componentes
   - Declarar componentes en módulo
   - Agregar rutas si es necesario

---

## Plan de Acción Detallado

### Fase 1: Integración Backend (30 minutos)

#### Paso 1.1: Modificar device.js
- [ ] Agregar import de ThingsBoardClient
- [ ] Agregar case en constructor (línea ~116)
- [ ] Agregar soporte browse (línea ~293)
- [ ] Agregar ThingsBoard a DeviceEnum (línea ~573)

#### Paso 1.2: Verificar dependencias
- [ ] Confirmar que axios está en package.json (✅ Ya está)
- [ ] Confirmar que mqtt está en package.json (✅ Ya está)

#### Paso 1.3: Testing backend
- [ ] Crear dispositivo ThingsBoard de prueba
- [ ] Verificar conexión
- [ ] Verificar lectura de telemetría
- [ ] Verificar escritura de atributos

### Fase 2: Integración Frontend (1-2 horas)

#### Paso 2.1: Actualizar modelo de dispositivo
- [ ] Agregar ThingsBoard a DeviceType enum
- [ ] Actualizar descriptor si es necesario

#### Paso 2.2: Crear componente de propiedades del dispositivo
- [ ] Crear `device-property-thingsboard.component.ts`
- [ ] Crear template HTML con formulario
- [ ] Agregar validación de campos
- [ ] Implementar "Test Connection"

#### Paso 2.3: Integrar componente de tags
- [ ] Verificar componente existente
- [ ] Registrar en módulo principal
- [ ] Agregar a routing si es necesario
- [ ] Conectar con device-map

#### Paso 2.4: Actualizar UI de dispositivos
- [ ] Agregar icono para ThingsBoard
- [ ] Agregar a lista de tipos de dispositivos
- [ ] Actualizar tooltips y ayuda

### Fase 3: Testing y Documentación (1 hora)

#### Paso 3.1: Testing integral
- [ ] Crear dispositivo desde UI
- [ ] Configurar conexión
- [ ] Auto-descubrir dispositivos
- [ ] Agregar tags
- [ ] Verificar lectura en tiempo real
- [ ] Verificar escritura de valores
- [ ] Verificar DAQ

#### Paso 3.2: Documentación de usuario
- [ ] Guía de configuración
- [ ] Ejemplos de uso
- [ ] Troubleshooting
- [ ] Screenshots

---

## Estructura de Archivos

```
FUXA/
├── server/
│   └── runtime/
│       └── devices/
│           ├── device.js                    ⚠️ MODIFICAR
│           ├── index.js                     ✅ OK
│           └── thingsboard/                 ✅ COMPLETO
│               ├── index.js
│               ├── tb-rest-client.js
│               ├── tb-mqtt-client.js
│               └── tb-device-mapper.js
│
└── client/
    └── src/
        └── app/
            ├── _models/
            │   └── device.ts                ⚠️ MODIFICAR
            │
            └── device/
                ├── device-property/
                │   └── device-property-thingsboard/  📋 CREAR
                │       ├── *.component.ts
                │       ├── *.component.html
                │       └── *.component.scss
                │
                └── tag-property/
                    └── tag-property-edit-thingsboard/  ✅ EXISTE
                        ├── *.component.ts
                        ├── *.component.html
                        └── *.component.scss
```

---

## Ejemplos de Uso

### Ejemplo 1: Configuración Básica

```javascript
// Configuración del dispositivo
{
  "id": "d_thingsboard_001",
  "name": "ThingsBoard Server",
  "type": "ThingsBoard",
  "enabled": true,
  "polling": 5000,
  "property": {
    "serverUrl": "http://demo.thingsboard.io",
    "username": "tenant@thingsboard.org",
    "password": "tenant",
    "useMqtt": true
  },
  "tags": {
    "t_temp_001": {
      "id": "t_temp_001",
      "name": "Sensor Temperature",
      "address": "a1b2c3d4-5678-90ab-cdef-1234567890ab:temperature",
      "type": "Real",
      "divisor": 1,
      "format": 2
    }
  }
}
```

### Ejemplo 2: Tag con Escritura RPC

```javascript
{
  "id": "t_setpoint_001",
  "name": "Temperature Setpoint",
  "address": "a1b2c3d4-5678-90ab-cdef-1234567890ab:setpoint",
  "type": "Real",
  "options": {
    "writeType": "rpc",
    "rpcMethod": "setTemperature"
  }
}
```

### Ejemplo 3: Tag con DAQ Habilitado

```javascript
{
  "id": "t_humidity_001",
  "name": "Humidity Sensor",
  "address": "a1b2c3d4-5678-90ab-cdef-1234567890ab:humidity",
  "type": "Real",
  "daq": {
    "enabled": true,
    "interval": 60,      // Guardar cada 60 segundos
    "changed": true,     // Solo si cambió el valor
    "restored": false
  }
}
```

---

## API del Driver

### Métodos Principales

#### connect()
Conecta al servidor ThingsBoard y opcionalmente al broker MQTT.

```javascript
await driver.connect();
```

#### disconnect()
Desconecta del servidor y broker MQTT.

```javascript
await driver.disconnect();
```

#### polling()
Lee telemetría de todos los dispositivos configurados.

```javascript
await driver.polling();
```

#### setValue(tagId, value)
Escribe un valor a ThingsBoard (atributo o RPC).

```javascript
await driver.setValue('t_temp_001', 25.5);
```

#### browse(path, callback)
Explora dispositivos y claves de telemetría.

```javascript
// Listar dispositivos
const devices = await driver.browse('');

// Listar telemetría de un dispositivo
const telemetry = await driver.browse('deviceId');
```

---

## Consideraciones Técnicas

### Seguridad
- Las credenciales se almacenan en la configuración del proyecto
- Se recomienda usar variables de entorno para producción
- Los tokens JWT se manejan automáticamente
- Soporte para HTTPS/MQTTS

### Rendimiento
- Polling configurable (default: 3000ms)
- MQTT reduce carga en el servidor
- Caché de dispositivos y telemetría
- Gestión de overloading

### Escalabilidad
- Soporte para múltiples dispositivos
- Paginación en listado de dispositivos
- Límites configurables en historial

### Compatibilidad
- ThingsBoard CE (Community Edition)
- ThingsBoard PE (Professional Edition)
- Versiones 3.x y superiores

---

## Troubleshooting

### Error: "Login failed"
- Verificar URL del servidor
- Verificar credenciales
- Verificar conectividad de red

### Error: "MQTT connection failed"
- Verificar puerto MQTT (1883/8883)
- Verificar firewall
- Probar sin MQTT (useMqtt: false)

### No se reciben valores
- Verificar que el dispositivo existe en ThingsBoard
- Verificar que las claves de telemetría son correctas
- Verificar formato de address (deviceId:key)

### Valores no se actualizan
- Verificar polling interval
- Verificar conexión MQTT
- Revisar logs del servidor

---

## Próximos Pasos

1. **Implementar cambios en backend** (device.js)
2. **Implementar cambios en frontend** (device.ts)
3. **Crear componente de propiedades del dispositivo**
4. **Testing integral**
5. **Documentación de usuario**
6. **Considerar funcionalidades adicionales**:
   - Soporte para alarmas de ThingsBoard
   - Integración con reglas de ThingsBoard
   - Soporte para relaciones entre dispositivos
   - Dashboard widgets específicos

---

## Referencias

- [ThingsBoard REST API](https://thingsboard.io/docs/reference/rest-api/)
- [ThingsBoard MQTT API](https://thingsboard.io/docs/reference/mqtt-api/)
- [FUXA Documentation](https://github.com/frangoteam/FUXA)

---

**Fecha**: 2025-10-07  
**Versión**: 1.0  
**Autor**: Análisis de integración ThingsBoard-FUXA
