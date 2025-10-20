# Inicio Rápido - ThingsBoard Integration

## 🚀 Primera Ejecución

### Lo que acabas de ver:

```
2025-10-16T19:32:00.388Z [DBG] settings.js default created successful!
2025-10-16T19:32:00.561Z [INF] FUXA V.1.2.7-2525
2025-10-16T19:32:03.446Z [ERR] thingsboard-config: initialization failed! Error: Configuration file not found
2025-10-16T19:32:04.159Z [INF] thingsboard-client: authenticating with 192.168.31.113...
2025-10-16T19:32:07.215Z [INF] FUXA init in 6843ms.
2025-10-16T19:32:07.372Z [INF] FUXA started!
2025-10-16T19:32:07.500Z [INF] WebServer is running http://127.0.0.1:1881/
```

### ✅ Esto es NORMAL en la primera ejecución

El error `Configuration file not found` es esperado la primera vez. El sistema:
1. ❌ No encuentra el archivo de configuración
2. ✅ Crea automáticamente la configuración por defecto
3. ✅ Intenta autenticar con ThingsBoard
4. ✅ FUXA inicia correctamente

---

## 🔍 Verificar Estado

### 1. Verificar que FUXA está corriendo
```bash
curl http://localhost:1881/api/thingsboard/status
```

**Respuesta esperada:**
```json
{
  "initialized": true,
  "enabled": true,
  "sync": {
    "running": true,
    "deviceCount": 0,
    "lastSyncTime": null,
    "clientStatus": {
      "connected": true,
      "hasToken": true,
      "wsConnected": false
    }
  }
}
```

### 2. Verificar archivo de configuración creado
```bash
ls -la /home/jsalazar-fcore/FUXA/FUXA/thingsboard-config.json
cat /home/jsalazar-fcore/FUXA/FUXA/thingsboard-config.json
```

**Contenido esperado:**
```json
{
  "enabled": true,
  "host": "192.168.31.113",
  "port": 8081,
  "protocol": "http",
  "username": "tenant@thingsboard.org",
  "password": "<encrypted>",
  "syncInterval": 30000,
  "useWebSocket": true,
  "reconnectInterval": 5000,
  "maxReconnectAttempts": 10,
  "requestTimeout": 10000,
  "deviceFilter": {
    "type": null,
    "label": null
  },
  "telemetryKeys": {
    "includeAll": true,
    "whitelist": [],
    "blacklist": []
  }
}
```

### 3. Verificar logs completos
```bash
# En la terminal donde corre FUXA, buscar:
grep "thingsboard" 
```

**Logs esperados:**
```
[INF] thingsboard: initializing...
[INF] thingsboard-config: configuration not found, creating default...
[INF] thingsboard-config: default configuration set
[INF] thingsboard-config: initialized with default configuration
[INF] thingsboard-client: authenticating with 192.168.31.113...
[INF] thingsboard-client: authenticated successfully
[INF] thingsboard: initialized successfully
[INF] runtime init thingsboard successful!
[INF] thingsboard-sync: starting...
[INF] thingsboard-sync: synced X devices
[INF] runtime.thingsboard-started
```

---

## 🧪 Probar Conexión

### Script de prueba automático:
```bash
cd /home/jsalazar-fcore/FUXA
./.cascade/test-thingsboard.sh
```

### Prueba manual:
```bash
# 1. Ping al servidor ThingsBoard
ping -c 3 192.168.31.113

# 2. Test de autenticación
curl -X POST http://192.168.31.113:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"tenant@thingsboard.org","password":"tenant"}'

# 3. Obtener devices desde FUXA
curl http://localhost:1881/api/thingsboard/devices
```

---

## ⚠️ Problemas Comunes

### Problema 1: "authentication failed"
**Síntoma:**
```
[ERR] thingsboard-client: authentication failed! connect ECONNREFUSED 192.168.31.113:8081
```

**Solución:**
1. Verificar que ThingsBoard está corriendo:
   ```bash
   ping 192.168.31.113
   curl http://192.168.31.113:8081
   ```
2. Verificar puerto correcto (8081)
3. Verificar credenciales en el archivo de configuración

### Problema 2: "Configuration file not found" persiste
**Síntoma:**
El error aparece en cada inicio

**Solución:**
1. Verificar permisos del directorio:
   ```bash
   ls -la /home/jsalazar-fcore/FUXA/FUXA/
   ```
2. Crear manualmente si es necesario:
   ```bash
   cd /home/jsalazar-fcore/FUXA/FUXA/
   touch thingsboard-config.json
   ```

### Problema 3: No aparecen devices
**Síntoma:**
```json
{"deviceCount": 0}
```

**Solución:**
1. Verificar que hay devices en ThingsBoard
2. Forzar sincronización:
   ```bash
   curl -X POST http://localhost:1881/api/thingsboard/sync
   ```
3. Revisar filtros en configuración

---

## 📊 Siguiente Paso: Reiniciar FUXA

Ahora que se creó la configuración, **reinicia FUXA** para ver los logs completos:

```bash
# Detener FUXA (Ctrl+C en la terminal)
# Luego reiniciar:
cd /home/jsalazar-fcore/FUXA/server
npm start
```

**Logs esperados en el segundo inicio:**
```
[INF] FUXA V.1.2.7-2525
[INF] thingsboard: initializing...
[INF] thingsboard-config: loaded from file
[INF] thingsboard-config: initialized successfully
[INF] thingsboard-client: authenticating with 192.168.31.113...
[INF] thingsboard-client: authenticated successfully
[INF] thingsboard: initialized successfully
[INF] runtime init thingsboard successful!
[INF] FUXA init in XXXXms.
[INF] FUXA started!
[INF] thingsboard-sync: starting...
[INF] thingsboard-client: retrieved X devices
[INF] thingsboard-sync: synced X devices
[INF] devices.load: loaded X ThingsBoard devices
[INF] runtime.thingsboard-started
[INF] thingsboard-client: WebSocket connected
[INF] thingsboard-sync: subscribed to X devices
```

---

## 🎯 Verificación Final

### Checklist:
- [ ] FUXA inició sin errores
- [ ] Archivo `thingsboard-config.json` existe
- [ ] ThingsBoard está conectado (`authenticated successfully`)
- [ ] Devices sincronizados (`synced X devices`)
- [ ] WebSocket conectado (`WebSocket connected`)
- [ ] API responde: `curl http://localhost:1881/api/thingsboard/status`

### Si todo está ✅:
¡La integración está funcionando! Los devices de ThingsBoard ahora están disponibles en FUXA.

### Si hay problemas ❌:
1. Revisar logs completos
2. Ejecutar script de prueba: `./.cascade/test-thingsboard.sh`
3. Verificar configuración de red y credenciales
4. Revisar documentación completa en `.cascade/IMPLEMENTACION_COMPLETA.md`

---

## 📚 Documentación Adicional

- **Implementación Completa**: `.cascade/IMPLEMENTACION_COMPLETA.md`
- **Plan de Integración**: `.cascade/PLAN_INTEGRACION_THINGSBOARD.md`
- **Reglas del Proyecto**: `.cascade/project-rules.md`

---

**¿Necesitas ayuda?** Revisa los logs y busca mensajes con `[ERR]` o `[WARN]`.
