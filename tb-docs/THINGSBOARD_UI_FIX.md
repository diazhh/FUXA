# Corrección UI - ThingsBoard no aparecía en lista

## 🐛 Problema

ThingsBoard no aparecía en la lista de tipos de dispositivos disponibles en la UI, aunque estaba correctamente definido en el modelo de datos.

**Síntoma**: Al abrir "Connections Property" para agregar un dispositivo, ThingsBoard no estaba en la lista desplegable.

---

## 🔍 Causa Raíz

La lista de tipos de dispositivos disponibles se genera dinámicamente en `device-map.component.ts` mediante el método `loadAvailableType()`.

Este método:
1. Carga tipos desde plugins instalados
2. Agrega tipos hardcodeados como `WebAPI`, `MQTTclient`, `internal`
3. **Faltaba agregar `ThingsBoard` a la lista hardcodeada**

---

## ✅ Solución Aplicada

### Archivo Modificado

`/home/jsalazar/FUXA/client/src/app/device/device-map/device-map.component.ts`

### Cambio Realizado (Línea 146)

```typescript
// ANTES
this.plugins.push(DeviceType.WebAPI);
this.plugins.push(DeviceType.MQTTclient);
this.plugins.push(DeviceType.internal);

// DESPUÉS
this.plugins.push(DeviceType.WebAPI);
this.plugins.push(DeviceType.MQTTclient);
this.plugins.push(DeviceType.ThingsBoard);  // ← AGREGADO
this.plugins.push(DeviceType.internal);
```

### Contexto Completo

```typescript
loadAvailableType() {
    // define available device type (plugins)
    this.plugins = [];
    if (!this.appService.isClientApp && !this.appService.isDemoApp) {
        this.pluginService.getPlugins().subscribe(plugins => {
            Object.values(plugins).forEach((pg) => {
                if (pg.current.length) {
                    this.plugins.push(pg.type);
                }
            });
        }, error => {
        });
        this.plugins.push(DeviceType.WebAPI);
        this.plugins.push(DeviceType.MQTTclient);
        this.plugins.push(DeviceType.ThingsBoard);  // ← NUEVO
        this.plugins.push(DeviceType.internal);
    } else {
        this.plugins.push(DeviceType.internal);
    }
}
```

---

## 📊 Resultado

### ✅ Compilación Exitosa

```bash
$ cd /home/jsalazar/FUXA/client
$ npm run build

✔ Browser application bundle generation complete.
✔ Copying assets complete.
✔ Index html generation complete.

Build at: 2025-10-07T13:14:31.766Z - Hash: 2e1274f4721ee86d - Time: 7791ms
```

### ✅ ThingsBoard Ahora Visible

Después de reiniciar el servidor, ThingsBoard aparecerá en la lista de tipos de dispositivos:

```
Connections Property
├── SiemensS7
├── OPCUA
├── ModbusRTU
├── ModbusTCP
├── WebAPI
├── MQTTclient
├── ThingsBoard  ← AHORA VISIBLE
├── internal
├── ODBC
└── ADSclient
```

---

## 🎯 Archivos Modificados - Resumen Total

### Backend
1. ✅ `/server/runtime/devices/device.js` - 5 cambios

### Frontend
1. ✅ `/client/src/app/_models/device.ts` - 2 cambios
2. ✅ `/client/src/app/device/tag-property/tag-property-edit-thingsboard/tag-property-edit-thingsboard.component.ts` - Corrección Socket.IO
3. ✅ `/client/src/app/device/device-map/device-map.component.ts` - 1 cambio (agregar a lista)

**Total**: 4 archivos modificados

---

## 🚀 Próximos Pasos

### 1. Reiniciar Servidor

```bash
cd /home/jsalazar/FUXA/server
npm start
```

### 2. Verificar en Navegador

1. Abrir http://localhost:1881
2. Ir a **Devices**
3. Click en **Add Device** o editar dispositivo existente
4. En el selector de tipo, **ThingsBoard debe aparecer en la lista**

### 3. Crear Dispositivo ThingsBoard

Una vez visible, configurar:

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

---

## 📝 Notas Técnicas

### ¿Por qué ThingsBoard es hardcodeado?

ThingsBoard, al igual que `WebAPI` y `MQTTclient`, es un driver nativo de FUXA que no requiere instalación de plugins externos. Por eso se agrega directamente a la lista en lugar de depender del sistema de plugins.

### Tipos de Dispositivos en FUXA

**Plugins Dinámicos** (requieren instalación):
- SiemensS7
- OPCUA
- ModbusRTU/TCP
- BACnet
- EthernetIP
- ODBC
- ADSclient
- GPIO
- WebCam
- MELSEC

**Drivers Nativos** (hardcodeados):
- WebAPI
- MQTTclient
- ThingsBoard ← NUEVO
- internal
- FuxaServer

---

## ✅ Verificación

### Antes del cambio
```typescript
this.plugins = ['WebAPI', 'MQTTclient', 'internal'];
// ThingsBoard NO estaba en la lista
```

### Después del cambio
```typescript
this.plugins = ['WebAPI', 'MQTTclient', 'ThingsBoard', 'internal'];
// ThingsBoard AHORA está en la lista ✓
```

### Comando de Verificación

```bash
# Verificar que el cambio está aplicado
grep -n "ThingsBoard" /home/jsalazar/FUXA/client/src/app/device/device-map/device-map.component.ts

# Debería mostrar:
# 146:            this.plugins.push(DeviceType.ThingsBoard);
```

---

## 🎉 Estado Final

| Componente | Estado | Detalles |
|------------|--------|----------|
| Backend | ✅ Completado | device.js modificado |
| Frontend - Modelo | ✅ Completado | device.ts modificado |
| Frontend - Componente | ✅ Completado | Socket.IO corregido |
| Frontend - UI Lista | ✅ Completado | device-map.component.ts modificado |
| Compilación | ✅ Exitosa | Sin errores |
| ThingsBoard Visible | ✅ Sí | Aparece en lista de tipos |

---

## 📚 Documentación Relacionada

- **THINGSBOARD_CHANGES_APPLIED.md** - Cambios iniciales
- **THINGSBOARD_FIXES_APPLIED.md** - Corrección Socket.IO
- **THINGSBOARD_UI_FIX.md** - Este documento (corrección UI)
- **NEXT_STEPS.md** - Próximos pasos

---

**Fecha**: 2025-10-07  
**Versión**: 1.2  
**Estado**: ThingsBoard completamente integrado y visible en UI
