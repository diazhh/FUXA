# Debug: ThingsBoard Sync Issue

## 🔍 Análisis de Logs Actuales

### Logs Observados:
```
2025-10-20T13:16:28.704Z [INF]  thingsboard-client: authenticating with 192.168.31.113...
2025-10-20T13:16:28.905Z [INF]  thingsboard-sync: syncing devices...
2025-10-20T13:16:29.663Z [INF]  thingsboard-client: connecting to WebSocket...
2025-10-20T13:16:29.665Z [WAR]  thingsboard-client: WebSocket not connected, cannot subscribe (x17)
2025-10-20T13:16:59.662Z [INF]  thingsboard-sync: syncing devices...
2025-10-20T13:17:29.665Z [INF]  thingsboard-sync: syncing devices...
```

### Logs FALTANTES (esperados pero no aparecen):
```
❌ [INF] thingsboard: initializing...
❌ [INF] thingsboard-config: loaded from file
❌ [INF] thingsboard: authenticated successfully
❌ [INF] thingsboard: initialized successfully
❌ [INF] runtime init thingsboard successful!
❌ [INF] runtime.thingsboard-auto-started
❌ [INF] thingsboard-client: retrieved X devices
❌ [INF] thingsboard-sync: synced X devices
❌ [INF] thingsboard-client: WebSocket connected
```

## 🐛 Problemas Identificados:

### 1. Init() no se está completando
- El log "thingsboard: initializing..." NO aparece
- El log "runtime init thingsboard successful!" NO aparece
- Esto sugiere que `init()` está fallando silenciosamente

### 2. Sync se ejecuta pero no completa
- Aparece "syncing devices..." cada 30 segundos
- NUNCA aparece "synced X devices"
- Esto significa que `syncDevices()` está fallando

### 3. WebSocket intenta conectar pero falla
- Aparece "connecting to WebSocket..."
- Inmediatamente 17 warnings de "cannot subscribe"
- WebSocket no se conecta exitosamente

## ✅ Fixes Implementados:

### Fix 1: Logging Mejorado en tb-sync.js

**Líneas 122-126:**
```javascript
const tbDevices = await this.client.getDevices();
this.logger.info(`thingsboard-sync: retrieved ${tbDevices ? tbDevices.length : 0} devices from ThingsBoard`);

const filteredDevices = this.filterDevices(tbDevices);
this.logger.info(`thingsboard-sync: ${filteredDevices.length} devices after filtering`);
```

**Líneas 151-156:**
```javascript
} catch (err) {
    this.logger.error(`thingsboard-sync: failed to sync devices! ${err.message}`);
    if (err.stack) {
        this.logger.error(`thingsboard-sync: stack trace: ${err.stack}`);
    }
    // Don't throw, allow sync to continue on next interval
}
```

### Fix 2: Logging Mejorado en tb-client.js

**Líneas 107-115:**
```javascript
if (!this.token) {
    this.logger.info('thingsboard-client: no token, authenticating...');
    await this.authenticate();
}

const baseUrl = `${this.config.protocol}://${this.config.host}:${this.config.port}`;
const url = `${baseUrl}/api/tenant/devices`;

this.logger.info(`thingsboard-client: fetching devices from ${url}`);
```

**Líneas 124-132:**
```javascript
this.logger.info(`thingsboard-client: response status ${response.status}`);

if (response.data && response.data.data) {
    this.logger.info(`thingsboard-client: retrieved ${response.data.data.length} devices`, true);
    return response.data.data;
}

this.logger.warn('thingsboard-client: response has no data.data field');
return [];
```

**Líneas 140-143:**
```javascript
this.logger.error(`thingsboard-client: failed to get devices! ${err.message}`);
if (err.response) {
    this.logger.error(`thingsboard-client: response status: ${err.response.status}, data: ${JSON.stringify(err.response.data)}`);
}
```

## 🧪 Siguiente Paso: Reiniciar con Logging Mejorado

### 1. Reiniciar FUXA
```bash
cd /home/jsalazar-fcore/FUXA/server
# Ctrl+C para detener
npm start
```

### 2. Logs Esperados Ahora:

**Si init() funciona:**
```
[INF] thingsboard: initializing...
[INF] thingsboard-config: loaded from file
[INF] thingsboard-client: authenticating with 192.168.31.113...
[INF] thingsboard: authenticated successfully
[INF] thingsboard: initialized successfully
[INF] runtime init thingsboard successful!
[INF] thingsboard-sync: starting...
[INF] thingsboard-sync: syncing devices...
[INF] thingsboard-client: fetching devices from http://192.168.31.113:8081/api/tenant/devices
[INF] thingsboard-client: response status 200
[INF] thingsboard-client: retrieved 10 devices
[INF] thingsboard-sync: retrieved 10 devices from ThingsBoard
[INF] thingsboard-sync: 10 devices after filtering
[INF] thingsboard-sync: added device 'test01'
... (más devices)
[INF] thingsboard-sync: synced 10 devices
[INF] runtime.thingsboard-auto-started
```

**Si hay errores:**
```
[ERR] thingsboard-sync: failed to sync devices! <error message>
[ERR] thingsboard-sync: stack trace: <stack trace>
[ERR] thingsboard-client: failed to get devices! <error message>
[ERR] thingsboard-client: response status: 401, data: {...}
```

### 3. Posibles Causas y Soluciones:

#### Causa A: Token expirado o inválido
**Síntoma:**
```
[ERR] thingsboard-client: response status: 401
```

**Solución:**
```bash
# Eliminar config y recrear
rm /home/jsalazar-fcore/FUXA/FUXA/thingsboard-config.json
# Reiniciar FUXA
```

#### Causa B: URL o endpoint incorrecto
**Síntoma:**
```
[ERR] thingsboard-client: failed to get devices! connect ECONNREFUSED
```

**Solución:**
Verificar que ThingsBoard esté corriendo:
```bash
curl http://192.168.31.113:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"tenant@thingsboard.org","password":"tenant"}'
```

#### Causa C: Permisos insuficientes
**Síntoma:**
```
[ERR] thingsboard-client: response status: 403
```

**Solución:**
Verificar que el usuario `tenant@thingsboard.org` tenga permisos para ver devices.

#### Causa D: Formato de respuesta diferente
**Síntoma:**
```
[WAR] thingsboard-client: response has no data.data field
```

**Solución:**
La API de ThingsBoard puede haber cambiado. Necesitamos ver la respuesta real.

## 📊 Checklist de Verificación:

Después de reiniciar, verificar:

- [ ] Aparece "thingsboard: initializing..."
- [ ] Aparece "runtime init thingsboard successful!"
- [ ] Aparece "fetching devices from http://..."
- [ ] Aparece "response status 200"
- [ ] Aparece "retrieved X devices"
- [ ] Aparece "synced X devices"
- [ ] NO aparecen errores [ERR]

Si alguno falta, copiar los logs completos para análisis.

## 🔧 Comandos Útiles:

### Ver configuración actual:
```bash
cat /home/jsalazar-fcore/FUXA/FUXA/thingsboard-config.json
```

### Probar API de ThingsBoard manualmente:
```bash
# 1. Obtener token
TOKEN=$(curl -s -X POST http://192.168.31.113:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"tenant@thingsboard.org","password":"tenant"}' \
  | jq -r '.token')

echo "Token: $TOKEN"

# 2. Obtener devices
curl -H "X-Authorization: Bearer $TOKEN" \
  http://192.168.31.113:8081/api/tenant/devices?pageSize=10&page=0 \
  | jq '.'
```

### Forzar sincronización:
```bash
curl -X POST http://localhost:1881/api/thingsboard/sync
```

### Ver status:
```bash
curl http://localhost:1881/api/thingsboard/status | jq '.'
```

---

**ACCIÓN REQUERIDA:** Reiniciar FUXA y compartir los logs completos desde el inicio.
