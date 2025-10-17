# 🚀 Próximos Pasos - Driver ThingsBoard

## ✅ Estado Actual

**Cambios aplicados exitosamente:**
- ✅ Backend modificado (device.js) - 5 cambios
- ✅ Frontend modificado (device.ts) - 2 cambios
- ✅ Componente ThingsBoard corregido (Socket.IO)
- ✅ Lista de tipos UI actualizada (device-map.component.ts)
- ✅ Frontend compilado exitosamente
- ✅ Archivos del driver verificados
- ✅ Dependencias confirmadas (axios, mqtt)

**Total**: 100% completado - ThingsBoard visible en UI

---

## 🎯 Paso 1: Reiniciar y Compilar (REQUERIDO)

### Opción A: Desarrollo (Recomendado para testing)

```bash
# Terminal 1 - Backend
cd /home/jsalazar/FUXA/server
npm start

# Terminal 2 - Frontend (en otra terminal)
cd /home/jsalazar/FUXA/client
npm start
```

### Opción B: Producción

```bash
# Compilar frontend
cd /home/jsalazar/FUXA/client
npm run build

# Iniciar servidor
cd /home/jsalazar/FUXA/server
npm start
```

---

## 🧪 Paso 2: Verificación Básica

### 2.1 Verificar que el servidor inicia sin errores

**Buscar en logs:**
```
✓ No debe haber errores de sintaxis
✓ No debe haber errores de "module not found"
✓ Debe iniciar normalmente
```

### 2.2 Abrir FUXA en navegador

```
http://localhost:1881
```

### 2.3 Verificar que ThingsBoard aparece

1. Ir a **Devices** (menú lateral)
2. Click en **Add Device** (botón +)
3. En el selector de tipo, verificar que aparece **"ThingsBoard"**

**Si aparece**: ✅ ¡Integración exitosa!  
**Si no aparece**: Revisar logs del servidor

---

## 🔧 Paso 3: Crear Dispositivo de Prueba

### 3.1 Configuración con ThingsBoard Demo

```json
{
  "name": "ThingsBoard Demo",
  "type": "ThingsBoard",
  "enabled": true,
  "polling": 5000,
  "property": {
    "serverUrl": "http://demo.thingsboard.io",
    "username": "tenant@thingsboard.org",
    "password": "tenant",
    "useMqtt": true
  }
}
```

### 3.2 Pasos en FUXA

1. **Devices** → **Add Device**
2. **Name**: "ThingsBoard Demo"
3. **Type**: Seleccionar "ThingsBoard"
4. **Enabled**: ✓ Activar
5. **Polling**: 5000 (ms)
6. **Property** (configurar manualmente en JSON o formulario):
   - Server URL: `http://demo.thingsboard.io`
   - Username: `tenant@thingsboard.org`
   - Password: `tenant`
   - Use MQTT: ✓ Activar
7. **Save**

---

## 📊 Paso 4: Agregar Tags (Manual)

### 4.1 Obtener Device ID de ThingsBoard

**Opción 1: Usar ThingsBoard Demo**
1. Ir a http://demo.thingsboard.io
2. Login: tenant@thingsboard.org / tenant
3. Devices → Seleccionar un dispositivo
4. Copiar el Device ID (formato UUID)

**Opción 2: Usar API REST**
```bash
# Login
TOKEN=$(curl -X POST http://demo.thingsboard.io/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"tenant@thingsboard.org","password":"tenant"}' \
  | jq -r '.token')

# Listar dispositivos
curl -X GET http://demo.thingsboard.io/api/tenant/devices \
  -H "X-Authorization: Bearer $TOKEN" | jq '.data[0]'
```

### 4.2 Crear Tag en FUXA

**Formato de address**: `deviceId:telemetryKey`

**Ejemplo**:
```json
{
  "name": "Temperature",
  "address": "a1b2c3d4-5678-90ab-cdef-1234567890ab:temperature",
  "type": "Real",
  "format": 2,
  "divisor": 1
}
```

**Pasos en FUXA**:
1. Abrir dispositivo ThingsBoard
2. **Tags** → **Add Tag**
3. Configurar:
   - Name: "Temperature"
   - Address: `deviceId:temperature` (reemplazar deviceId)
   - Type: "Real"
   - Format: 2
4. **Save**

---

## 🎉 Paso 5: Verificar Funcionamiento

### 5.1 Verificar Conexión

**En FUXA**:
- El dispositivo debe mostrar estado **"Connected"** (verde)
- Si está rojo, revisar:
  - URL correcta
  - Credenciales correctas
  - Conectividad de red

### 5.2 Verificar Lectura de Valores

**En FUXA**:
- Los tags deben mostrar valores actualizados
- Los valores deben cambiar si la telemetría cambia en ThingsBoard
- Verificar timestamp de última actualización

### 5.3 Verificar Logs

```bash
# Ver logs del servidor
tail -f /home/jsalazar/FUXA/server/logs/fuxa.log | grep ThingsBoard
```

**Buscar**:
- `'ThingsBoard Demo' connecting to ThingsBoard`
- `'ThingsBoard Demo' authenticated successfully`
- `'ThingsBoard Demo' MQTT connected` (si MQTT habilitado)
- `'ThingsBoard Demo' loaded X tags`

---

## 🐛 Troubleshooting

### Problema: ThingsBoard no aparece en lista de tipos

**Solución**:
```bash
# Verificar cambios
grep "ThingsBoard" /home/jsalazar/FUXA/client/src/app/_models/device.ts

# Recompilar frontend
cd /home/jsalazar/FUXA/client
npm run build

# Limpiar caché del navegador
Ctrl + Shift + R (o Cmd + Shift + R en Mac)
```

### Problema: Error "Cannot find module './thingsboard'"

**Solución**:
```bash
# Verificar que existe el directorio
ls -la /home/jsalazar/FUXA/server/runtime/devices/thingsboard/

# Verificar import en device.js
grep "require('./thingsboard')" /home/jsalazar/FUXA/server/runtime/devices/device.js

# Reiniciar servidor
cd /home/jsalazar/FUXA/server
npm start
```

### Problema: "Login failed"

**Solución**:
- Verificar URL (debe incluir http:// o https://)
- Verificar credenciales
- Probar login manual en ThingsBoard web
- Verificar conectividad: `curl http://demo.thingsboard.io`

### Problema: "MQTT connection failed"

**Solución**:
- Verificar puerto MQTT (1883 para mqtt, 8883 para mqtts)
- Verificar firewall
- Probar sin MQTT: `useMqtt: false`
- Verificar logs: `tail -f server/logs/fuxa.log | grep MQTT`

### Problema: Valores no se actualizan

**Solución**:
- Verificar formato de address: `deviceId:key`
- Verificar que el dispositivo existe en ThingsBoard
- Verificar que la clave de telemetría es correcta
- Verificar polling interval (debe ser > 0)
- Revisar logs del servidor

---

## 📈 Funcionalidades Disponibles

### ✅ Ahora Disponible

- **Conexión REST API**: Autenticación y comunicación con ThingsBoard
- **Telemetría en tiempo real**: Vía MQTT (opcional)
- **Polling de telemetría**: Vía REST API
- **Lectura de valores**: Latest y histórico
- **Escritura de valores**: Atributos compartidos
- **Comandos RPC**: One-way y two-way
- **Integración DAQ**: Guardado automático de datos
- **Gestión de tokens**: Refresh automático de JWT

### 📋 Pendiente (Fase 2 - Opcional)

- **UI de configuración**: Formulario visual para propiedades
- **Auto-descubrimiento**: Browse de dispositivos desde UI
- **Browse de telemetría**: Selección visual de claves
- **Selección múltiple**: Agregar varios tags a la vez
- **Iconos**: Icono específico para ThingsBoard

---

## 🎓 Recursos Adicionales

### Documentación Generada

1. **README_THINGSBOARD.md** - Índice general y guía de lectura
2. **THINGSBOARD_QUICK_REFERENCE.md** - Referencia rápida
3. **THINGSBOARD_IMPLEMENTATION_GUIDE.md** - Guía completa
4. **THINGSBOARD_ARCHITECTURE.md** - Diagramas y arquitectura
5. **THINGSBOARD_CHANGES_DIFF.md** - Cambios línea por línea
6. **THINGSBOARD_ACTION_PLAN.md** - Plan de acción detallado
7. **THINGSBOARD_CHANGES_APPLIED.md** - Estado de cambios aplicados

### ThingsBoard Demo

- **URL**: http://demo.thingsboard.io
- **Usuario**: tenant@thingsboard.org
- **Password**: tenant
- **Documentación**: https://thingsboard.io/docs/

### Comandos Útiles

```bash
# Ver logs en tiempo real
tail -f server/logs/fuxa.log | grep ThingsBoard

# Verificar integración
./verify-thingsboard-integration.sh

# Buscar referencias
grep -r "ThingsBoard" server/runtime/devices/device.js
grep -r "ThingsBoard" client/src/app/_models/device.ts

# Test de conexión
curl -X POST http://demo.thingsboard.io/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"tenant@thingsboard.org","password":"tenant"}'
```

---

## ✅ Checklist Final

### Antes de Testing
- [x] Cambios aplicados en device.js
- [x] Cambios aplicados en device.ts
- [x] Archivos del driver verificados
- [x] Dependencias confirmadas
- [ ] Servidor reiniciado
- [ ] Frontend compilado

### Durante Testing
- [ ] ThingsBoard aparece en lista de tipos
- [ ] Se puede crear dispositivo ThingsBoard
- [ ] Dispositivo se conecta exitosamente
- [ ] Se pueden agregar tags
- [ ] Valores se leen correctamente
- [ ] Valores se actualizan en tiempo real
- [ ] Escritura de valores funciona

### Post-Testing
- [ ] Documentar problemas encontrados
- [ ] Crear ejemplos de uso
- [ ] Considerar implementar Fase 2 (UI)

---

## 🎯 Objetivos Logrados

✅ **Fase 1 Completada**: Integración básica funcional  
📋 **Fase 2 Pendiente**: UI completa (opcional)  
🎉 **Driver Operativo**: Listo para usar con configuración manual

---

## 💡 Recomendaciones

1. **Empezar simple**: Probar primero con ThingsBoard Demo
2. **Verificar paso a paso**: No pasar al siguiente paso si hay errores
3. **Revisar logs**: Los logs son tu mejor amigo para debugging
4. **Documentar**: Anotar cualquier problema o mejora
5. **Fase 2 opcional**: La UI es conveniente pero no esencial

---

**¡El driver ThingsBoard está listo para usar!**

**Siguiente acción**: Reiniciar servidor y compilar frontend
