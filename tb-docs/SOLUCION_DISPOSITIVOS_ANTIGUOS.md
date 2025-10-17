# 🔧 Solución: Dispositivos ThingsBoard Antiguos

## 🐛 Problema

Los dispositivos ThingsBoard creados **antes** de las correcciones tienen propiedades vacías o incorrectas, causando el error:

```
[ERR] ThingsBoard login failed: connect ECONNREFUSED ::1:80
```

Estos dispositivos se cargan automáticamente al iniciar el servidor.

---

## ✅ Solución Rápida: Eliminar Dispositivos Antiguos desde la UI

### Opción 1: Eliminar desde FUXA (Recomendado)

**Paso 1**: Con el servidor corriendo, abre http://localhost:1881

**Paso 2**: Ve a **Devices** (menú lateral)

**Paso 3**: Elimina los dispositivos ThingsBoard antiguos:
- Busca dispositivos llamados "kk", "tb", "tbh", etc.
- Click derecho → **Delete** (o botón de eliminar)
- Confirma la eliminación

**Paso 4**: Reinicia el servidor
```bash
# Detén el servidor (Ctrl+C en la terminal)
# Reinicia
npm start
```

**Paso 5**: Crea un **NUEVO** dispositivo ThingsBoard
- **Name**: "ThingsBoard Demo"
- **Type**: "ThingsBoard"
- **Server URL**: `http://demo.thingsboard.io`
- **Username**: `tenant@thingsboard.org`
- **Password**: `tenant`
- **Use MQTT**: ✓

---

### Opción 2: Limpiar Base de Datos (Más Rápido)

Si quieres empezar completamente limpio:

**Paso 1**: Detén el servidor (Ctrl+C)

**Paso 2**: Haz backup de la base de datos
```bash
cd /home/jsalazar/FUXA/server/_appdata
cp project.fuxap.db project.fuxap.db.backup_$(date +%Y%m%d_%H%M%S)
```

**Paso 3**: Elimina la base de datos
```bash
rm project.fuxap.db
```

**Paso 4**: Reinicia el servidor
```bash
cd /home/jsalazar/FUXA/server
npm start
```

**Paso 5**: Crea un nuevo dispositivo ThingsBoard con la configuración correcta

---

### Opción 3: Editar Dispositivo Existente

Si quieres mantener el dispositivo pero corregir sus propiedades:

**Paso 1**: En FUXA, ve a **Devices**

**Paso 2**: Click en el dispositivo ThingsBoard ("kk" o "tbh")

**Paso 3**: **IMPORTANTE**: Asegúrate de que los campos tengan valores:
- **Server URL**: Debe tener `http://demo.thingsboard.io` (no vacío)
- **Username**: Debe tener `tenant@thingsboard.org` (no vacío)
- **Password**: Debe tener `tenant` (no vacío)

**Paso 4**: Click **OK** para guardar

**Paso 5**: El servidor debería recargar automáticamente el dispositivo

---

## 🔍 Verificación

### Cómo saber si funcionó

**Logs correctos** (sin errores):
```
[INF] 'ThingsBoard Demo' created
[INF] 'ThingsBoard Demo' start
[INF] 'ThingsBoard Demo' connecting to ThingsBoard http://demo.thingsboard.io
[INF] 'ThingsBoard Demo' authenticated successfully
[INF] 'ThingsBoard Demo' MQTT connected
[INF] 'ThingsBoard Demo' loaded 0 tags
```

**Logs incorrectos** (con errores):
```
[ERR] ThingsBoard login failed:
[ERR] 'kk' connection error: Error: Login failed: connect ECONNREFUSED ::1:80
```

---

## 🎯 Por Qué Sucede Esto

### Dispositivos Antiguos

Los dispositivos creados **antes** de las correcciones tienen:
```json
{
  "property": {
    "address": "",
    "port": "",
    // NO tienen serverUrl, username, password
  }
}
```

### Dispositivos Nuevos

Los dispositivos creados **después** de las correcciones tienen:
```json
{
  "property": {
    "serverUrl": "http://demo.thingsboard.io",
    "username": "tenant@thingsboard.org",
    "password": "tenant",
    "useMqtt": true
  }
}
```

---

## 📋 Checklist de Solución

- [ ] Servidor detenido (Ctrl+C)
- [ ] Dispositivos antiguos eliminados (desde UI o limpiando DB)
- [ ] Servidor reiniciado
- [ ] Navegador refrescado (Ctrl+Shift+R)
- [ ] Nuevo dispositivo ThingsBoard creado
- [ ] Campos del formulario completados:
  - [ ] Server URL: `http://demo.thingsboard.io`
  - [ ] Username: `tenant@thingsboard.org`
  - [ ] Password: `tenant`
  - [ ] Use MQTT: ✓
- [ ] Dispositivo guardado (click OK)
- [ ] Logs verificados (sin errores ECONNREFUSED)
- [ ] Conexión exitosa mostrada en logs

---

## 🚀 Comando Rápido

Para empezar completamente limpio:

```bash
# Detener servidor (Ctrl+C en la terminal donde corre)

# Limpiar y reiniciar
cd /home/jsalazar/FUXA/server
mv _appdata/project.fuxap.db _appdata/project.fuxap.db.old
npm start
```

Luego crea un nuevo dispositivo ThingsBoard desde la UI.

---

## 🐛 Si Aún Persiste el Error

### Verificar que el frontend está actualizado

```bash
cd /home/jsalazar/FUXA/client
npm run build
```

### Verificar que el navegador tiene la versión nueva

1. Abre DevTools (F12)
2. Pestaña **Network**
3. Marca **Disable cache**
4. Refresca con Ctrl+Shift+R

### Verificar los archivos modificados

```bash
# Verificar que ThingsBoard está en device-map
grep "ThingsBoard" /home/jsalazar/FUXA/client/src/app/device/device-map/device-map.component.ts

# Verificar que la inicialización está en device-property
grep -A5 "Initialize ThingsBoard" /home/jsalazar/FUXA/client/src/app/device/device-property/device-property.component.ts
```

---

## 📞 Siguiente Paso

**Recomendación**: Usa la **Opción 2** (Limpiar Base de Datos) para empezar limpio:

```bash
# 1. Detén el servidor (Ctrl+C)

# 2. Limpia la base de datos
cd /home/jsalazar/FUXA/server
mv _appdata/project.fuxap.db _appdata/project.fuxap.db.backup_old

# 3. Reinicia
npm start

# 4. Abre http://localhost:1881 y crea un nuevo dispositivo ThingsBoard
```

Esto garantiza que empiezas con un dispositivo que tiene las propiedades correctas.

---

**¿Quieres que ejecute estos comandos por ti para limpiar la base de datos?**
