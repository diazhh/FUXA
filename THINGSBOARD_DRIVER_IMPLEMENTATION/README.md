# Driver ThingsBoard para FUXA - Implementación Completa

## 📋 Índice

1. [Descripción General](#descripción-general)
2. [Características](#características)
3. [Estructura del Proyecto](#estructura-del-proyecto)
4. [Documentación](#documentación)
5. [Instalación Rápida](#instalación-rápida)
6. [Arquitectura](#arquitectura)
7. [Ejemplos de Uso](#ejemplos-de-uso)
8. [FAQ](#faq)

---

## Descripción General

Este proyecto proporciona un **driver nativo de ThingsBoard** para FUXA, permitiendo la integración completa entre FUXA (SCADA/HMI) y ThingsBoard (plataforma IoT).

### ¿Qué es esto?

- **Driver Backend (Node.js):** Maneja la comunicación con ThingsBoard vía REST API y MQTT
- **Componentes Frontend (Angular):** Interfaz de usuario para configurar y gestionar dispositivos
- **Auto-descubrimiento:** Detecta automáticamente dispositivos y telemetría de ThingsBoard
- **Tiempo Real:** Actualización de datos vía MQTT con latencia < 100ms

### ¿Por qué usar este driver?

| Sin Driver Nativo | Con Driver Nativo |
|-------------------|-------------------|
| ❌ Configuración manual de cada tag | ✅ Auto-descubrimiento de dispositivos |
| ❌ Mapeo manual de topics MQTT | ✅ Mapeo automático de telemetría |
| ❌ Sin navegación de dispositivos | ✅ Navegación tipo árbol |
| ❌ Configuración compleja | ✅ Configuración simple (3 campos) |
| ⚠️ Solo MQTT o REST | ✅ Dual: MQTT + REST API |

---

## Características

### ✨ Funcionalidades Principales

- ✅ **Autenticación JWT** con ThingsBoard
- ✅ **Auto-descubrimiento** de dispositivos del tenant
- ✅ **Navegación** de claves de telemetría
- ✅ **Lectura en tiempo real** vía MQTT
- ✅ **Lectura por polling** vía REST API (fallback)
- ✅ **Escritura de atributos** compartidos
- ✅ **Comandos RPC** bidireccionales
- ✅ **Reconexión automática** ante fallos
- ✅ **Refresh de token** automático
- ✅ **Soporte DAQ** para históricos
- ✅ **Mapeo inteligente** de tipos de datos

### 🎯 Casos de Uso

1. **Monitoreo Industrial:** Visualizar telemetría de sensores IoT en dashboards SCADA
2. **Control Remoto:** Enviar comandos a dispositivos desde HMI
3. **Análisis Histórico:** Almacenar y analizar datos con DAQ de FUXA
4. **Alarmas:** Configurar alarmas basadas en telemetría de ThingsBoard
5. **Integración Multi-Plataforma:** Combinar datos de PLCs (Modbus, S7) con IoT (ThingsBoard)

---

## Estructura del Proyecto

```
THINGSBOARD_DRIVER_IMPLEMENTATION/
├── README.md                           # Este archivo
├── QUICK_START_GUIDE.md                # Guía de inicio rápido (30 min)
├── backend/
│   └── thingsboard/
│       ├── index.js                    # Driver principal
│       ├── tb-rest-client.js           # Cliente REST API
│       ├── tb-mqtt-client.js           # Cliente MQTT
│       └── tb-device-mapper.js         # Mapeador de dispositivos
└── frontend/
    ├── tag-property-edit-thingsboard.component.ts
    ├── tag-property-edit-thingsboard.component.html
    └── tag-property-edit-thingsboard.component.scss
```

---

## Documentación

### 📚 Documentos Disponibles

1. **[THINGSBOARD_DRIVER_DEVELOPMENT.md](../THINGSBOARD_DRIVER_DEVELOPMENT.md)**
   - Documentación técnica completa (60+ páginas)
   - Arquitectura detallada
   - API de ThingsBoard
   - Guía de desarrollo paso a paso
   - Testing y validación

2. **[QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md)**
   - Instalación en 30 minutos
   - Configuración básica
   - Primer dispositivo
   - Troubleshooting

3. **Código Fuente Comentado**
   - Todos los archivos incluyen documentación inline
   - JSDoc para funciones principales
   - Ejemplos de uso

---

## Instalación Rápida

### Requisitos Previos

- Node.js v18.x
- FUXA instalado
- ThingsBoard server (local o remoto)

### Instalación en 3 Pasos

```bash
# 1. Copiar archivos backend
cp -r backend/thingsboard /home/jsalazar/FUXA/server/runtime/devices/

# 2. Copiar archivos frontend
cp -r frontend/* /home/jsalazar/FUXA/client/src/app/device/tag-property/tag-property-edit-thingsboard/

# 3. Aplicar modificaciones (ver QUICK_START_GUIDE.md)
```

### Verificación

```bash
# Backend
ls /home/jsalazar/FUXA/server/runtime/devices/thingsboard/
# Debe mostrar: index.js, tb-rest-client.js, tb-mqtt-client.js, tb-device-mapper.js

# Frontend
ls /home/jsalazar/FUXA/client/src/app/device/tag-property/tag-property-edit-thingsboard/
# Debe mostrar: .ts, .html, .scss
```

---

## Arquitectura

### Diagrama de Alto Nivel

```
┌─────────────────────────────────────────────────────────────┐
│                      FUXA Frontend                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Device Property Component                           │   │
│  │  - Configuración de conexión                         │   │
│  │  - URL, username, password                           │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Tag Property Edit ThingsBoard Component             │   │
│  │  - Browse de dispositivos                            │   │
│  │  - Selección de telemetría                           │   │
│  │  - Auto-creación de tags                             │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │ WebSocket / REST
┌────────────────────────▼────────────────────────────────────┐
│                    FUXA Backend                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ThingsBoard Driver (index.js)                       │   │
│  │  ┌────────────────┐  ┌────────────────┐             │   │
│  │  │ REST Client    │  │ MQTT Client    │             │   │
│  │  │ - Auth JWT     │  │ - Telemetry    │             │   │
│  │  │ - Devices      │  │ - Real-time    │             │   │
│  │  │ - Telemetry    │  │ - Subscribe    │             │   │
│  │  │ - Attributes   │  │ - Publish      │             │   │
│  │  │ - RPC          │  └────────────────┘             │   │
│  │  └────────────────┘                                  │   │
│  │  ┌────────────────────────────────────────────────┐ │   │
│  │  │ Device Mapper                                  │ │   │
│  │  │ - TB Device → FUXA Device                      │ │   │
│  │  │ - TB Telemetry → FUXA Tags                     │ │   │
│  │  └────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API (8080) + MQTT (1883)
┌────────────────────────▼────────────────────────────────────┐
│                    ThingsBoard Server                        │
│  - Gestión de dispositivos                                   │
│  - Almacenamiento de telemetría                              │
│  - Procesamiento de reglas                                   │
│  - API REST + MQTT Broker                                    │
└─────────────────────────────────────────────────────────────┘
```

### Flujo de Datos

#### 1. Conexión Inicial
```
FUXA → REST: POST /api/auth/login
ThingsBoard → FUXA: JWT Token
FUXA → MQTT: Connect con token
MQTT Broker → FUXA: Connected
```

#### 2. Auto-Descubrimiento
```
Usuario → FUXA: Click "Browse"
FUXA → REST: GET /api/tenant/devices
ThingsBoard → FUXA: Lista de dispositivos
FUXA → REST: GET /api/plugins/telemetry/DEVICE/{id}/keys/timeseries
ThingsBoard → FUXA: Claves de telemetría
FUXA → Usuario: Árbol de dispositivos y telemetría
```

#### 3. Lectura en Tiempo Real (MQTT)
```
Dispositivo IoT → ThingsBoard: Telemetría
ThingsBoard → MQTT: Publish v1/gateway/telemetry
FUXA MQTT Client → Driver: Telemetry event
Driver → FUXA Core: Update tag values
FUXA Core → Frontend: WebSocket update
Frontend → Usuario: Actualización visual
```

#### 4. Escritura de Datos
```
Usuario → Frontend: Cambiar valor
Frontend → Backend: setValue(tagId, value)
Backend → Driver: setValue()
Driver → REST: POST /api/plugins/telemetry/.../attributes
ThingsBoard → Dispositivo: Atributo actualizado
Dispositivo → ThingsBoard: Confirmación
ThingsBoard → FUXA: Telemetría actualizada (MQTT)
```

---

## Ejemplos de Uso

### Ejemplo 1: Monitoreo de Temperatura

**Escenario:** Sensor DHT11 enviando temperatura y humedad a ThingsBoard

```javascript
// 1. Dispositivo en ThingsBoard
Device Name: "DHT11 Sensor"
Telemetry Keys: ["temperature", "humidity"]

// 2. Configuración en FUXA
Device Type: ThingsBoard
Server URL: http://localhost:8080
Username: tenant@thingsboard.org
Password: tenant

// 3. Tags auto-creados
tb_deviceId_temperature → Type: Real, Address: deviceId:temperature
tb_deviceId_humidity → Type: Real, Address: deviceId:humidity

// 4. Visualización
Gauge → Bind to: tb_deviceId_temperature
Chart → Bind to: tb_deviceId_temperature, tb_deviceId_humidity
```

### Ejemplo 2: Control de Relay

**Escenario:** Controlar un relay desde FUXA

```javascript
// 1. Tag en FUXA
Name: relay_status
Address: deviceId:relay
Type: Bool
Options: { writeType: 'rpc', rpcMethod: 'setValue' }

// 2. Control en HMI
Button → Action: setValue(relay_status, true)  // Encender
Button → Action: setValue(relay_status, false) // Apagar

// 3. Comando RPC enviado
POST /api/plugins/rpc/twoway/{deviceId}
{
  "method": "setValue",
  "params": { "relay": true }
}
```

### Ejemplo 3: Dashboard Multi-Dispositivo

```javascript
// Múltiples sensores en una vista
Devices:
  - Sensor 1: temperature, humidity
  - Sensor 2: pressure, altitude
  - Sensor 3: light, motion

Tags auto-creados: 6 tags
Visualización: 
  - 3 Gauges para temperatura
  - 1 Chart con todas las temperaturas
  - 1 Tabla con todos los valores
```

---

## FAQ

### ¿Necesito modificar ThingsBoard?

**No.** El driver usa la API estándar de ThingsBoard. No requiere plugins o modificaciones.

### ¿Funciona con ThingsBoard Cloud?

**Sí.** Solo cambia la URL del servidor:
```
Server URL: https://demo.thingsboard.io
```

### ¿Puedo usar múltiples servidores ThingsBoard?

**Sí.** Crea un dispositivo FUXA por cada servidor ThingsBoard.

### ¿Cuántos dispositivos soporta?

El driver puede manejar **cientos de dispositivos** simultáneamente. El límite depende de:
- Recursos del servidor FUXA
- Límites de la cuenta ThingsBoard
- Intervalo de polling configurado

### ¿Qué pasa si ThingsBoard está offline?

El driver:
1. Detecta la desconexión
2. Marca el dispositivo como "offline"
3. Intenta reconectar automáticamente cada 5 segundos
4. Restaura la conexión cuando ThingsBoard vuelve

### ¿Puedo escribir telemetría desde FUXA a ThingsBoard?

**Sí.** Usa:
- **Atributos compartidos:** Para valores de configuración
- **Comandos RPC:** Para acciones inmediatas

### ¿Soporta históricos?

**Sí.** Habilita DAQ en los tags y FUXA almacenará los valores en su base de datos local.

### ¿Funciona con ThingsBoard PE (Professional Edition)?

**Sí.** El driver es compatible con todas las versiones de ThingsBoard.

### ¿Cuál es la latencia de actualización?

- **Con MQTT:** < 100ms
- **Con Polling REST:** 1-5 segundos (configurable)

### ¿Puedo contribuir al proyecto?

**¡Sí!** Este es un proyecto open source. Contribuciones bienvenidas:
- Reportar bugs
- Sugerir mejoras
- Enviar pull requests
- Mejorar documentación

---

## Soporte y Contacto

### Recursos

- **Documentación FUXA:** https://github.com/frangoteam/FUXA/wiki
- **Documentación ThingsBoard:** https://thingsboard.io/docs/
- **Issues FUXA:** https://github.com/frangoteam/FUXA/issues

### Troubleshooting

Si encuentras problemas:

1. Revisa los logs: `server/_logs/fuxa.log`
2. Verifica la conexión a ThingsBoard
3. Consulta la sección de troubleshooting en `QUICK_START_GUIDE.md`
4. Busca en issues de FUXA

---

## Licencia

Este driver sigue la misma licencia que FUXA: **MIT License**

---

## Créditos

- **FUXA:** https://github.com/frangoteam/FUXA
- **ThingsBoard:** https://thingsboard.io
- **Desarrollado para:** Integración FUXA-ThingsBoard

---

## Changelog

### v1.0.0 (2025-10-06)
- ✨ Implementación inicial
- ✅ Soporte REST API completo
- ✅ Soporte MQTT para tiempo real
- ✅ Auto-descubrimiento de dispositivos
- ✅ Componentes frontend
- ✅ Documentación completa

---

**¿Listo para empezar?** → Ver [QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md)
