# ThingsBoard Auto-Discovery - Documentación

## Descripción General

El driver de ThingsBoard en FUXA ahora incluye **descubrimiento automático periódico** de dispositivos y telemetría. Esto significa que cuando agregas nuevos dispositivos a ThingsBoard, FUXA los detectará automáticamente sin necesidad de reiniciar el sistema.

## Características

### 1. Descubrimiento Inicial
- Se ejecuta al conectar con ThingsBoard
- Descubre todos los dispositivos existentes y sus claves de telemetría
- Crea tags automáticamente en FUXA

### 2. Descubrimiento Periódico
- Se ejecuta automáticamente cada 60 segundos (configurable)
- Detecta nuevos dispositivos agregados a ThingsBoard
- Detecta nuevas claves de telemetría en dispositivos existentes
- Solo crea tags para elementos nuevos (no duplica tags existentes)
- Emite eventos para actualizar la configuración en FUXA

## Configuración

### Parámetros Disponibles

En la configuración del dispositivo ThingsBoard en FUXA, puedes configurar:

```json
{
  "serverUrl": "http://localhost:8080",
  "username": "tenant@thingsboard.org",
  "password": "tenant",
  "useMqtt": true,
  "autoDiscover": true,
  "discoveryInterval": 60000
}
```

#### Parámetros:

- **`autoDiscover`** (boolean, default: `true`)
  - Habilita/deshabilita el descubrimiento automático de dispositivos
  - Si es `false`, no se ejecutará ningún descubrimiento

- **`discoveryInterval`** (number, default: `60000`)
  - Intervalo en milisegundos entre ejecuciones de descubrimiento
  - Valor mínimo recomendado: 30000 (30 segundos)
  - Valor por defecto: 60000 (60 segundos)
  - Si es `0`, solo se ejecuta el descubrimiento inicial

### Ejemplos de Configuración

#### Descubrimiento cada 2 minutos
```json
{
  "discoveryInterval": 120000
}
```

#### Descubrimiento cada 5 minutos
```json
{
  "discoveryInterval": 300000
}
```

#### Solo descubrimiento inicial (sin periódico)
```json
{
  "discoveryInterval": 0
}
```

#### Deshabilitar descubrimiento completamente
```json
{
  "autoDiscover": false
}
```

## Funcionamiento Interno

### Proceso de Descubrimiento

1. **Obtener dispositivos de ThingsBoard**
   - Consulta la API REST de ThingsBoard
   - Obtiene hasta 100 dispositivos (configurable)

2. **Para cada dispositivo:**
   - Obtiene las claves de telemetría disponibles
   - Verifica si ya existen tags para esas claves
   - Crea tags nuevos solo si no existen

3. **Estructura de Tags Creados:**
   ```javascript
   {
     id: "deviceId_telemetryKey",
     name: "DeviceName.telemetryKey",
     address: "deviceId:telemetryKey",
     type: "number",
     device: "thingsboard-device-id",
     memaddress: "deviceId:telemetryKey",
     divisor: 1,
     daq: {}
   }
   ```

4. **Emisión de Eventos:**
   - Si se crean nuevos tags, emite evento `device-tags-update`
   - FUXA guarda automáticamente la configuración actualizada

### Logs de Descubrimiento

El sistema genera logs informativos durante el descubrimiento:

```
'ThingsBoard Local' starting periodic device discovery every 60000ms
'ThingsBoard Local' running periodic device discovery...
'ThingsBoard Local' discovering ThingsBoard devices...
'ThingsBoard Local' found 4 ThingsBoard devices
'ThingsBoard Local' device 'Sensor1' has 2 telemetry keys
'ThingsBoard Local' discovery complete: 4 devices processed, 2 tags created, 5 tags skipped (already exist)
'ThingsBoard Local' emitting device-tags-update event with 2 new tags
```

## Casos de Uso

### Caso 1: Agregar un Nuevo Dispositivo a ThingsBoard

1. Creas un nuevo dispositivo en ThingsBoard
2. El dispositivo comienza a enviar telemetría
3. En el siguiente ciclo de descubrimiento (máximo 60 segundos), FUXA:
   - Detecta el nuevo dispositivo
   - Crea tags automáticamente
   - Los tags están disponibles inmediatamente en el editor

### Caso 2: Agregar Nueva Telemetría a un Dispositivo Existente

1. Un dispositivo existente comienza a enviar una nueva clave de telemetría
2. En el siguiente ciclo de descubrimiento:
   - FUXA detecta la nueva clave
   - Crea un nuevo tag para esa clave
   - El tag está disponible inmediatamente

### Caso 3: Entorno de Producción con Muchos Dispositivos

Si tienes muchos dispositivos y quieres reducir la carga en ThingsBoard:

```json
{
  "discoveryInterval": 300000  // 5 minutos
}
```

## Rendimiento y Consideraciones

### Impacto en el Sistema

- **Carga en ThingsBoard:** Mínima - solo consultas REST periódicas
- **Carga en FUXA:** Muy baja - solo procesa dispositivos nuevos
- **Red:** Tráfico mínimo - solo metadatos, no telemetría

### Recomendaciones

1. **Intervalo de Descubrimiento:**
   - Desarrollo/Testing: 30-60 segundos
   - Producción estable: 2-5 minutos
   - Producción con cambios frecuentes: 1 minuto

2. **Desactivar si no es necesario:**
   - Si tu configuración de dispositivos es estática, considera usar `discoveryInterval: 0`
   - Esto ejecutará solo el descubrimiento inicial

3. **Monitoreo:**
   - Revisa los logs para verificar el funcionamiento
   - Los logs muestran cuántos dispositivos se procesan y tags se crean

## Solución de Problemas

### Los nuevos dispositivos no aparecen

1. Verifica que `autoDiscover: true`
2. Verifica que `discoveryInterval > 0`
3. Revisa los logs para errores de autenticación
4. Verifica que el dispositivo tenga telemetría en ThingsBoard

### Demasiados logs de descubrimiento

- Aumenta el `discoveryInterval` a un valor mayor
- O desactiva el descubrimiento periódico con `discoveryInterval: 0`

### Tags duplicados

- No debería ocurrir - el sistema verifica tags existentes
- Si ocurre, reporta el bug con los logs

## Actualización desde Versión Anterior

Si estás actualizando desde una versión sin descubrimiento periódico:

1. Los tags existentes se mantienen intactos
2. El descubrimiento periódico se activa automáticamente
3. No es necesaria ninguna configuración adicional
4. El intervalo por defecto es 60 segundos

Para mantener el comportamiento anterior (solo descubrimiento inicial):
```json
{
  "discoveryInterval": 0
}
```

## Código de Referencia

El código de descubrimiento periódico se encuentra en:
- `/server/runtime/devices/thingsboard/index.js`
- Función: `_startPeriodicDiscovery()`
- Función: `_discoverDevices()`

## Changelog

### Versión Actual
- ✅ Descubrimiento periódico automático
- ✅ Intervalo configurable
- ✅ Detección de nuevos dispositivos
- ✅ Detección de nueva telemetría
- ✅ Prevención de duplicados
- ✅ Logs informativos
- ✅ Limpieza automática al desconectar

### Próximas Mejoras Planeadas
- [ ] Configuración desde UI
- [ ] Filtros de dispositivos por tipo/etiqueta
- [ ] Notificaciones cuando se descubren nuevos dispositivos
- [ ] Dashboard de dispositivos descubiertos
