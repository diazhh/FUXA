# Almacenamiento de Datos - ThingsBoard en FUXA

## 🎯 Principio Fundamental

**FUXA NO almacena información de devices ni telemetría de ThingsBoard en su base de datos.**

ThingsBoard es la **fuente única de verdad** para:
- Devices
- Telemetría (tags)
- Valores actuales
- Históricos

---

## ✅ Lo que SÍ se Guarda en FUXA

### 1. Configuración de Conexión

**Ubicación:** `/home/jsalazar-fcore/FUXA/_appdata/thingsboard-config.json`

**Contenido:**
```json
{
  "enabled": true,
  "host": "192.168.31.113",
  "port": 8081,
  "protocol": "http",
  "username": "tenant@thingsboard.org",
  "password": "iv:encrypted_password",
  "syncInterval": 30000,
  "useWebSocket": true,
  "reconnectInterval": 5000,
  "maxReconnectAttempts": 10,
  "requestTimeout": 10000
}
```

**Tamaño aproximado:** < 1 KB

**Propósito:** Credenciales para conectar con ThingsBoard

---

### 2. Referencias a Tags en el Proyecto

**Ubicación:** `/home/jsalazar-fcore/FUXA/_appdata/project.fuxap` (archivo del proyecto)

**Contenido:** Solo las **referencias** a tags de ThingsBoard, NO los valores.

**Formato de referencia:**
```
tb:{deviceId}:{telemetryKey}
```

**Ejemplo en el proyecto:**
```json
{
  "views": [
    {
      "id": "view1",
      "svgcontent": "...",
      "items": {
        "gauge1": {
          "type": "output",
          "property": {
            "variableId": "tb:622b4ba0-a850-11f0-aabd-5b2d2a47a78c:temperatura"
          }
        }
      }
    }
  ]
}
```

**Tamaño:** Solo el string del ID (~60-80 caracteres por tag)

**Propósito:** Saber qué tags de ThingsBoard usar en cada elemento visual

---

### 3. Suscripciones Activas (En Memoria)

**Ubicación:** RAM del servidor (variable `tbTagSubscriptions`)

**Estructura:**
```javascript
Map {
  "tb:622b4ba0:temperatura" => {
    deviceId: "622b4ba0-a850-11f0-aabd-5b2d2a47a78c",
    key: "temperatura",
    lastValue: 25.3
  },
  "tb:622b4ba0:humedad" => {
    deviceId: "622b4ba0-a850-11f0-aabd-5b2d2a47a78c",
    key: "humedad",
    lastValue: 65.8
  }
}
```

**Duración:** Solo mientras Lab/Home está abierto

**Propósito:** 
- Saber qué tags consultar en el polling
- Detectar cambios de valor
- Evitar emitir eventos duplicados

**Se borra cuando:**
- El usuario cierra Lab/Home
- El servidor se reinicia
- El WebSocket se desconecta

---

## ❌ Lo que NO se Guarda en FUXA

### 1. Devices de ThingsBoard

**NO se guarda:**
- Lista de devices
- Nombres de devices
- IDs de devices
- Tipos de devices
- Etiquetas de devices
- Atributos de devices

**Se consulta:** On-demand desde ThingsBoard API cada vez que se necesita

**Endpoint usado:** `GET /api/tenant/devices`

---

### 2. Telemetría (Tags)

**NO se guarda:**
- Claves de telemetría disponibles
- Tipos de datos
- Unidades
- Descripciones

**Se consulta:** On-demand desde ThingsBoard API cuando el usuario abre Tag Selection

**Endpoint usado:** `GET /api/plugins/telemetry/DEVICE/{id}/keys/timeseries`

---

### 3. Valores de Telemetría

**NO se guarda:**
- Valores actuales
- Valores históricos
- Timestamps
- Metadatos

**Se consulta:** 
- On-demand cuando se necesita un valor específico
- Polling cada 1 segundo para tags suscritos en Lab/Home

**Endpoint usado:** `GET /api/plugins/telemetry/DEVICE/{id}/values/timeseries`

---

### 4. Históricos

**NO se guarda:**
- Series temporales
- Agregaciones
- Estadísticas

**Se consulta:** Directamente desde ThingsBoard cuando se necesita

**Endpoint usado:** `GET /api/plugins/telemetry/DEVICE/{id}/values/timeseries?startTs=X&endTs=Y`

---

## 🔄 Flujo de Datos

### Escenario 1: Usuario Abre Tag Selection

```
1. Usuario click "Tag Selection"
   ↓
2. Frontend: GET /api/thingsboard/devices
   ↓
3. Backend: Consulta ThingsBoard (NO lee de BD)
   ↓
4. ThingsBoard: Retorna lista de devices
   ↓
5. Backend: Retorna devices al frontend
   ↓
6. Frontend: Muestra devices en árbol
   ↓
7. Usuario selecciona device
   ↓
8. Frontend: GET /api/thingsboard/device/{id}/keys
   ↓
9. Backend: Consulta ThingsBoard (NO lee de BD)
   ↓
10. ThingsBoard: Retorna claves de telemetría
    ↓
11. Backend: Retorna claves al frontend
    ↓
12. Frontend: Muestra claves como tags
    ↓
13. Usuario selecciona tag "temperatura"
    ↓
14. Frontend: Guarda referencia "tb:622b4ba0:temperatura" en proyecto
```

**Datos guardados en FUXA:** Solo el string `"tb:622b4ba0:temperatura"`

**Datos NO guardados:** Nombre del device, tipo, valor actual, etc.

---

### Escenario 2: Usuario Abre Lab/Home

```
1. Usuario abre Lab
   ↓
2. Frontend: Lee proyecto de BD
   ↓
3. Frontend: Encuentra tag "tb:622b4ba0:temperatura"
   ↓
4. Frontend: Emit "device-tags-subscribe" con ["tb:622b4ba0:temperatura"]
   ↓
5. Backend: Agrega tag a tbTagSubscriptions (en RAM)
   ↓
6. Backend: Consulta valor inicial de ThingsBoard
   ↓
7. ThingsBoard: Retorna valor actual (25.3)
   ↓
8. Backend: Guarda lastValue en RAM (25.3)
   ↓
9. Backend: Emit "device-value:changed" al frontend
   ↓
10. Frontend: Muestra valor en UI
    ↓
11. [Cada 1 segundo]
    Backend: Consulta ThingsBoard
    ↓
12. ThingsBoard: Retorna nuevo valor (25.5)
    ↓
13. Backend: Compara con lastValue (25.3 != 25.5)
    ↓
14. Backend: Actualiza lastValue en RAM (25.5)
    ↓
15. Backend: Emit "device-value:changed" al frontend
    ↓
16. Frontend: Actualiza UI con nuevo valor
```

**Datos guardados en FUXA:** Solo `lastValue` en RAM (temporal)

**Datos NO guardados:** Histórico de valores, timestamps, etc.

---

### Escenario 3: Usuario Cierra Lab/Home

```
1. Usuario cierra Lab
   ↓
2. Frontend: Desconecta WebSocket
   ↓
3. Backend: Detecta desconexión
   ↓
4. Backend: Limpia tbTagSubscriptions (borra de RAM)
   ↓
5. Backend: Detiene polling para ese cliente
```

**Datos guardados:** Ninguno

**Datos borrados:** Todas las suscripciones y lastValues en RAM

---

## 📊 Comparación de Almacenamiento

| Dato | FUXA (Devices Normales) | FUXA (ThingsBoard) | ThingsBoard |
|------|-------------------------|-------------------|-------------|
| **Device Info** | ✅ Guardado en BD | ❌ NO guardado | ✅ Fuente de verdad |
| **Tags/Telemetría** | ✅ Guardado en BD | ❌ NO guardado | ✅ Fuente de verdad |
| **Valores Actuales** | ✅ Guardado en BD | ❌ Solo en RAM (temporal) | ✅ Fuente de verdad |
| **Históricos** | ✅ Guardado en BD | ❌ NO guardado | ✅ Fuente de verdad |
| **Referencias en Proyecto** | ✅ Guardado | ✅ Guardado | ❌ N/A |
| **Configuración** | ✅ Guardado | ✅ Guardado | ❌ N/A |

---

## 💾 Tamaño de Almacenamiento

### Por Proyecto con ThingsBoard:

```
Archivo de Proyecto (project.fuxap):
├─ Sin tags ThingsBoard: ~10 KB
├─ Con 10 tags ThingsBoard: ~10.6 KB (+60 bytes por tag)
├─ Con 100 tags ThingsBoard: ~16 KB (+60 bytes por tag)
└─ Con 1000 tags ThingsBoard: ~70 KB (+60 bytes por tag)

Archivo de Configuración (thingsboard-config.json):
└─ Siempre: ~1 KB

Total en Disco:
├─ Proyecto pequeño: ~11 KB
├─ Proyecto mediano: ~17 KB
└─ Proyecto grande: ~71 KB
```

### En RAM (Durante Ejecución):

```
Suscripciones Activas (tbTagSubscriptions):
├─ Por tag: ~200 bytes (deviceId + key + lastValue + overhead)
├─ 10 tags: ~2 KB
├─ 100 tags: ~20 KB
└─ 1000 tags: ~200 KB

Muy eficiente en memoria.
```

---

## 🔍 Verificar qué se Guarda

### 1. Ver archivo de proyecto:

```bash
cd /home/jsalazar-fcore/FUXA/_appdata
cat project.fuxap | jq '.views[].items | to_entries[] | select(.value.property.variableId | startswith("tb:"))'
```

Muestra solo los elementos que usan tags de ThingsBoard.

### 2. Ver configuración de ThingsBoard:

```bash
cat thingsboard-config.json | jq .
```

### 3. Ver suscripciones activas (en logs):

```bash
cd /home/jsalazar-fcore/FUXA/server
tail -f _logs/fuxa.log | grep "total ThingsBoard subscriptions"
```

Muestra cuántos tags están suscritos en RAM.

---

## 🎯 Ventajas de este Enfoque

### 1. Sincronización Automática

Si cambias algo en ThingsBoard:
- ✅ Nuevo device → Aparece inmediatamente en Tag Selection
- ✅ Nueva telemetría → Aparece inmediatamente en Tag Selection
- ✅ Device eliminado → Desaparece inmediatamente
- ✅ Valor cambiado → Se actualiza en 1 segundo en Lab/Home

**NO necesitas "sincronizar" manualmente.**

### 2. Ahorro de Espacio

- ✅ No duplicas información que ya existe en ThingsBoard
- ✅ Base de datos de FUXA permanece pequeña
- ✅ No hay problemas de inconsistencia de datos

### 3. Fuente Única de Verdad

- ✅ ThingsBoard es la fuente autoritativa
- ✅ No hay conflictos entre FUXA y ThingsBoard
- ✅ Cambios en ThingsBoard se reflejan inmediatamente

### 4. Escalabilidad

- ✅ Puedes tener miles de devices en ThingsBoard
- ✅ FUXA solo consulta los que necesita
- ✅ No hay límite de devices o tags

---

## ⚠️ Consideraciones

### 1. Dependencia de Red

Si ThingsBoard no está disponible:
- ❌ Tag Selection no mostrará devices
- ❌ Valores no se actualizarán en Lab/Home
- ⚠️ Proyecto seguirá funcionando con otros devices (no ThingsBoard)

**Solución:** Asegurar alta disponibilidad de ThingsBoard

### 2. Latencia

- Consultas on-demand pueden tener latencia de red
- Polling cada 1 segundo puede tener delay

**Solución:** Usar WebSocket en futuro para tiempo real verdadero

### 3. Carga en ThingsBoard

- Polling cada 1 segundo genera tráfico HTTP
- Muchos clientes pueden sobrecargar ThingsBoard

**Solución:** 
- Usar WebSocket en futuro
- Ajustar intervalo de polling si es necesario

---

## 📋 Resumen

### ✅ Se Guarda en FUXA:

1. **Credenciales de conexión** (encriptadas)
2. **Referencias a tags** en el proyecto (solo IDs)
3. **Último valor conocido** en RAM (temporal, solo durante Lab/Home)

### ❌ NO se Guarda en FUXA:

1. **Devices de ThingsBoard**
2. **Claves de telemetría**
3. **Valores de telemetría**
4. **Históricos**
5. **Metadatos de devices**
6. **Atributos de devices**

### 🔄 Se Consulta On-Demand:

1. **Devices** - Cuando abres Tag Selection
2. **Telemetría** - Cuando seleccionas un device
3. **Valores** - Polling cada 1 segundo en Lab/Home

---

## 📚 Referencias

- **Código de Almacenamiento:** `/server/runtime/index.js` (tbTagSubscriptions)
- **Código de Configuración:** `/server/runtime/thingsboard/tb-config.js`
- **Código de Proyecto:** `/server/api/projects/index.js`
