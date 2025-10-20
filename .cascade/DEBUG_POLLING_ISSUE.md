# 🐛 Debug: Valores No se Actualizan en Lab/Home

## 📊 Estado Actual

### ✅ Funcionando:
1. Tag Selection muestra tags de ThingsBoard
2. Tags se guardan correctamente en la configuración
3. Tags persisten después de guardar el proyecto
4. Polling está iniciado (intervalo 1 segundo)

### ❌ No Funcionando:
1. Valores no se actualizan en Lab/Home

---

## 🔍 Diagnóstico

### Posibles Causas:

#### 1. Frontend no está suscribiéndose
El frontend debe enviar un mensaje `device-tags-subscribe` cuando abre Lab/Home con los IDs de los tags que necesita.

#### 2. Backend no está recibiendo suscripciones
El handler de `DEVICE_TAGS_SUBSCRIBE` debe recibir el mensaje y agregar los tags a `tbTagSubscriptions`.

#### 3. Polling no está consultando
El intervalo debe estar ejecutándose cada 1 segundo y consultando ThingsBoard API.

#### 4. Eventos no se están emitiendo
Cuando el valor cambia, debe emitir `device-value:changed` que el frontend escucha.

#### 5. Frontend no está recibiendo actualizaciones
El WebSocket debe enviar los valores actualizados al frontend.

---

## 🧪 Verificación Paso a Paso

### Paso 1: Verificar que el servidor está corriendo

```bash
curl http://localhost:1881/api/thingsboard/status
```

**Esperado:**
```json
{
  "initialized": true,
  "enabled": true,
  "client": {
    "connected": true,
    "authenticated": true
  }
}
```

### Paso 2: Abrir Lab y Monitorear Logs

1. **En una terminal, monitorea los logs:**
```bash
cd /home/jsalazar-fcore/FUXA/server
tail -f _logs/fuxa.log | grep -E "subscribe|polling|ThingsBoard"
```

2. **Abre FUXA en el navegador:**
```
http://localhost:1881
```

3. **Abre Lab** (botón Play)

**Logs Esperados:**
```
[INF] runtime: received tag subscription with X tags
[INF] runtime: subscribed to ThingsBoard tag tb:abc123:pv
[INF] runtime: total ThingsBoard subscriptions: 1
[INF] runtime: polling 1 ThingsBoard tags
```

### Paso 3: Verificar en la Consola del Navegador

1. **Abre DevTools** (F12)
2. **Ve a Console**
3. **Busca errores o warnings**

**Esperado:**
- No debe haber errores de WebSocket
- No debe haber errores de suscripción

### Paso 4: Verificar Network Tab

1. **Abre DevTools** (F12)
2. **Ve a Network**
3. **Filtra por WS (WebSocket)**
4. **Abre Lab**

**Esperado:**
- Debe haber una conexión WebSocket activa
- Debe enviar mensaje `device-tags-subscribe`
- Debe recibir mensajes `device-values`

---

## 🔧 Logs Agregados para Debug

He agregado logs temporales en:

### `/server/runtime/index.js`

#### En `DEVICE_TAGS_SUBSCRIBE`:
```javascript
logger.info(`runtime: received tag subscription with ${message.tagsId ? message.tagsId.length : 0} tags`, true);
logger.info(`runtime: subscribed to ThingsBoard tag ${tagId}`, true);
logger.info(`runtime: total ThingsBoard subscriptions: ${tbTagSubscriptions.size}`, true);
```

#### En `startThingsBoardPolling()`:
```javascript
logger.info(`runtime: polling ${tbTagSubscriptions.size} ThingsBoard tags`, true);
```

---

## 📝 Escenarios de Prueba

### Escenario 1: Tag en Output Element

1. **Editor:**
   - Agrega Output element
   - Configura Value con tag de ThingsBoard (ej: `tb:622c4ba0:pv`)
   - Guarda proyecto

2. **Lab:**
   - Abre Lab
   - Observa el Output element

**Esperado:**
- Debe mostrar el valor actual
- Debe actualizarse cada 1 segundo

### Escenario 2: Tag en Text Element

1. **Editor:**
   - Agrega Text element
   - Configura variable con tag de ThingsBoard
   - Guarda proyecto

2. **Home:**
   - Abre Home
   - Observa el Text element

**Esperado:**
- Debe mostrar el valor actual
- Debe actualizarse cada 1 segundo

---

## 🚨 Problemas Comunes

### Problema 1: No hay logs de suscripción

**Síntoma:**
```bash
tail -f _logs/fuxa.log | grep subscribe
# No output
```

**Causa:** El frontend no está enviando el mensaje de suscripción

**Solución:** Verificar que el elemento tiene el tag configurado correctamente

### Problema 2: Polling no se ejecuta

**Síntoma:**
```bash
tail -f _logs/fuxa.log | grep polling
# Solo muestra "ThingsBoard polling started (1s interval)"
# No muestra "polling X ThingsBoard tags"
```

**Causa:** `tbTagSubscriptions.size === 0`

**Solución:** El frontend no está suscribiéndose o la suscripción no se está guardando

### Problema 3: Error en getLatestTelemetry

**Síntoma:**
```
[ERR] runtime: failed to poll ThingsBoard device abc123! ...
```

**Causa:** Error al consultar ThingsBoard API

**Solución:** Verificar conectividad con ThingsBoard

---

## 🔍 Siguiente Paso

**Abre Lab y verifica los logs:**

```bash
cd /home/jsalazar-fcore/FUXA/server
tail -f _logs/fuxa.log | grep -E "subscribe|polling|ThingsBoard"
```

**Luego reporta:**
1. ¿Aparece "received tag subscription"?
2. ¿Aparece "subscribed to ThingsBoard tag"?
3. ¿Aparece "polling X ThingsBoard tags"?
4. ¿Hay algún error?

---

## 💡 Hipótesis Principal

Sospecho que el problema es que **el frontend no está enviando el mensaje de suscripción** cuando abre Lab/Home.

Esto puede ser porque:
1. El elemento no tiene el tag guardado correctamente
2. El frontend no reconoce tags con formato `tb:` para suscribirse
3. Hay un filtro que excluye tags de ThingsBoard

**Necesito ver los logs para confirmar.**
