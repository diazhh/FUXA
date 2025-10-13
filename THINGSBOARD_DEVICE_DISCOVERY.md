# ThingsBoard - Descubrimiento Automático de Dispositivos

## 🎯 Funcionalidad Implementada

El driver de ThingsBoard ahora **descubre automáticamente** todos los dispositivos disponibles en tu instancia de ThingsBoard y crea tags para cada telemetría.

### ✅ Características

1. **Auto-descubrimiento**: Al conectarse, obtiene todos los dispositivos de ThingsBoard
2. **Creación automática de tags**: Crea un tag por cada telemetría de cada dispositivo
3. **Polling REST**: Usa REST API para obtener telemetría (no requiere credenciales MQTT)
4. **Nomenclatura clara**: Tags nombrados como `DeviceName.telemetryKey`

---

## 🔧 Cómo Funciona

### 1. Conexión
Cuando el dispositivo FUXA se conecta a ThingsBoard:
```
1. Autentica con REST API
2. Obtiene lista de dispositivos: GET /api/tenant/devices
3. Para cada dispositivo:
   - Obtiene claves de telemetría: GET /api/plugins/telemetry/DEVICE/{id}/keys/timeseries
   - Crea un tag por cada clave
4. Emite evento de actualización de tags
```

### 2. Polling
Cada intervalo de polling (ej: 5 segundos):
```
1. Para cada dispositivo con tags:
   - Obtiene última telemetría: GET /api/plugins/telemetry/DEVICE/{id}/values/timeseries
   - Actualiza valores de tags
2. Emite valores actualizados a FUXA
```

---

## 📊 Estructura de Tags

### Formato de Tag ID
```
{deviceId}_{telemetryKey}
```

Ejemplo:
```
a1b2c3d4-e5f6-7890-abcd-ef1234567890_temperature
```

### Formato de Tag Name
```
{deviceName}.{telemetryKey}
```

Ejemplo:
```
SensorCocina.temperature
SensorCocina.humidity
SensorSala.temperature
```

### Formato de Address
```
{deviceId}:{telemetryKey}
```

Ejemplo:
```
a1b2c3d4-e5f6-7890-abcd-ef1234567890:temperature
```

---

## 🚀 Cómo Usar

### Paso 1: Reiniciar Servidor
```bash
cd /home/jsalazar/FUXA/server
npm start
```

### Paso 2: Verificar Logs
Deberías ver:
```
[INF] 'test6' connecting to ThingsBoard http://localhost:8080
[INF] 'test6' authenticated successfully
[INF] 'test6' discovering ThingsBoard devices...
[INF] 'test6' found 5 ThingsBoard devices
[INF] 'test6' device 'SensorCocina' has 3 telemetry keys
[INF] 'test6' device 'SensorSala' has 2 telemetry keys
[INF] 'test6' created 15 tags from ThingsBoard devices
[INF] 'test6' restored 15/15 values
```

### Paso 3: Ver Tags en FUXA
1. Ve a **Devices** en FUXA
2. Haz click en el dispositivo ThingsBoard (ej: `test6`)
3. Ve a la pestaña **Tags**
4. Deberías ver todos los tags creados automáticamente

### Paso 4: Usar Tags en HMI
Los tags están disponibles para usar en:
- **Gauges** (medidores)
- **Charts** (gráficas)
- **Text** (valores numéricos)
- **Alarms** (alarmas)
- Cualquier componente de FUXA

---

## 🔍 Ejemplo de Dispositivos ThingsBoard

### Dispositivo: Sensor de Temperatura
```json
{
  "id": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  },
  "name": "SensorCocina",
  "type": "default"
}
```

### Telemetría Disponible
```json
{
  "temperature": 25.5,
  "humidity": 60.2,
  "battery": 85
}
```

### Tags Creados en FUXA
```
1. ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890_temperature
   Name: SensorCocina.temperature
   Address: a1b2c3d4-e5f6-7890-abcd-ef1234567890:temperature
   Value: 25.5

2. ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890_humidity
   Name: SensorCocina.humidity
   Address: a1b2c3d4-e5f6-7890-abcd-ef1234567890:humidity
   Value: 60.2

3. ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890_battery
   Name: SensorCocina.battery
   Address: a1b2c3d4-e5f6-7890-abcd-ef1234567890:battery
   Value: 85
```

---

## ⚙️ Configuración

### Intervalo de Polling
El intervalo se configura en el dispositivo FUXA:
- **5 sec**: Actualización cada 5 segundos (recomendado)
- **10 sec**: Actualización cada 10 segundos
- **30 sec**: Actualización cada 30 segundos

### MQTT Desactivado
Para usar solo REST API (sin MQTT):
1. Edita el dispositivo ThingsBoard en FUXA
2. **Desmarca** "Use MQTT for real-time telemetry"
3. Guarda

Esto evita errores de autenticación MQTT y usa solo REST API.

---

## 📝 Logs Importantes

### Conexión Exitosa
```
[INF] 'test6' connecting to ThingsBoard http://localhost:8080
[INF] 'test6' authenticated successfully
[INF] 'test6' discovering ThingsBoard devices...
[INF] 'test6' found 5 ThingsBoard devices
[INF] 'test6' created 15 tags from ThingsBoard devices
```

### Polling Exitoso
```
[INF] 'test6' restored 15/15 values
```

### Errores Comunes
```
[ERR] 'test6' device discovery error: Error: Request failed with status code 401
```
**Solución**: Verifica credenciales (username/password)

```
[ERR] 'test6' connection error: Error: connect ECONNREFUSED
```
**Solución**: Verifica que ThingsBoard esté corriendo en localhost:8080

---

## 🎨 Uso en HMI

### Ejemplo 1: Mostrar Temperatura
1. Agrega un componente **Text** al HMI
2. Selecciona el tag: `SensorCocina.temperature`
3. El valor se actualizará automáticamente cada 5 segundos

### Ejemplo 2: Gráfica de Temperatura
1. Agrega un componente **Chart**
2. Agrega serie con el tag: `SensorCocina.temperature`
3. La gráfica mostrará el histórico de temperatura

### Ejemplo 3: Alarma de Temperatura Alta
1. Ve a **Alarms**
2. Crea nueva alarma
3. Condición: `SensorCocina.temperature > 30`
4. Se activará cuando la temperatura supere 30°C

---

## 🔄 Actualización de Dispositivos

Si agregas nuevos dispositivos en ThingsBoard:

### Opción 1: Reconectar
1. En FUXA, deshabilita el dispositivo ThingsBoard
2. Espera 5 segundos
3. Habilita el dispositivo
4. Se volverá a conectar y descubrirá los nuevos dispositivos

### Opción 2: Reiniciar Servidor
```bash
# Detener servidor (Ctrl+C)
cd /home/jsalazar/FUXA/server
npm start
```

---

## 📊 Rendimiento

### Número de Dispositivos
- **1-10 dispositivos**: Excelente rendimiento
- **10-50 dispositivos**: Buen rendimiento
- **50-100 dispositivos**: Considera aumentar intervalo de polling
- **100+ dispositivos**: Considera filtrar dispositivos o usar MQTT

### Consumo de API
Con 10 dispositivos y 5 telemetrías cada uno:
- **Descubrimiento**: 11 requests (1 vez al conectar)
- **Polling cada 5 seg**: 10 requests
- **Por hora**: ~7,200 requests

---

## 🐛 Troubleshooting

### No se crean tags
**Problema**: Logs muestran "found 0 ThingsBoard devices"

**Soluciones**:
1. Verifica que hay dispositivos en ThingsBoard
2. Verifica que el usuario tiene permisos para ver dispositivos
3. Verifica que los dispositivos tienen telemetría

### Tags creados pero sin valores
**Problema**: Tags aparecen pero valor es null

**Soluciones**:
1. Verifica que los dispositivos están enviando telemetría
2. Verifica en ThingsBoard que hay datos recientes
3. Espera un ciclo de polling (5-10 segundos)

### Error de autenticación
**Problema**: "Login failed: User account is not active"

**Soluciones**:
1. Verifica credenciales en ThingsBoard
2. Verifica que el usuario está activo
3. Verifica que el usuario tiene rol de TENANT_ADMIN

---

## ✅ Resumen

**Ahora FUXA puede**:
- ✅ Conectarse a ThingsBoard via REST API
- ✅ Descubrir automáticamente todos los dispositivos
- ✅ Crear tags para cada telemetría
- ✅ Obtener valores mediante polling REST (sin MQTT)
- ✅ Actualizar valores en tiempo real
- ✅ Usar los valores en HMI, alarmas, gráficas, etc.

**Sin necesidad de**:
- ❌ Configurar MQTT
- ❌ Crear tags manualmente
- ❌ Conocer IDs de dispositivos
- ❌ Configurar credenciales por dispositivo

---

**¡Listo para usar! Reinicia el servidor y verás los dispositivos de ThingsBoard automáticamente en FUXA.**
