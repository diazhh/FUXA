# Estado Actual - Integración ThingsBoard

## 📊 Resumen

Después de múltiples intentos, hemos identificado el problema raíz pero aún no está completamente resuelto.

---

## ✅ Lo que Funciona

### 1. Driver ThingsBoard
- ✅ Driver implementado y funcional
- ✅ Se conecta correctamente a ThingsBoard cuando tiene las propiedades correctas
- ✅ Autenticación REST funciona
- ✅ El dispositivo creado manualmente (script) funciona perfectamente

### 2. Frontend
- ✅ ThingsBoard aparece en la lista de tipos
- ✅ Formulario se muestra con campos correctos
- ✅ Campos son editables
- ✅ Valores se capturan correctamente en el componente
- ✅ Console.logs muestran que las propiedades están correctas antes de guardar

### 3. Compilación
- ✅ Frontend compila sin errores
- ✅ Backend funciona correctamente

---

## ❌ Lo que NO Funciona

### Problema Principal: Propiedades No se Guardan en BD

**Síntoma**:
- Usuario ingresa valores en el formulario
- Console.logs muestran valores correctos
- Click en OK
- Dispositivo se guarda en BD
- **Pero las propiedades de ThingsBoard (serverUrl, username, password, useMqtt) NO se guardan**
- Solo se guardan propiedades genéricas (port, slot, baudrate, etc.)

**Evidencia**:

Console.log del navegador (correcto):
```javascript
Property: {
  "serverUrl": "http://localhost:8080",
  "username": "tenant@thingsboard.org",
  "password": "tenant",
  "useMqtt": false,
  "delay": 10,
  "baudrate": 9600,
  ...
}
```

Base de datos (incorrecto):
```json
{
  "property": {
    "port": null,
    "slot": null,
    "rack": null,
    "baudrate": 9600,
    "databits": 8,
    "stopbits": 1,
    "parity": "None",
    "delay": 10,
    "socketReuse": null
  }
}
```

---

## 🔍 Causa Raíz

El backend de FUXA está **filtrando/eliminando** las propiedades de ThingsBoard durante la serialización al guardar en la base de datos.

### Posibles Razones:

1. **Serialización Selectiva**: El backend puede estar usando un esquema o whitelist de propiedades permitidas
2. **Objeto Prototipo**: TypeScript puede no estar incluyendo las propiedades en el objeto serializado
3. **Transformación en el Backend**: Algún middleware está transformando el objeto antes de guardarlo

---

## 🛠️ Intentos Realizados

### 1. Agregar Campos a DeviceNetProperty ✅
```typescript
serverUrl?: string;
username?: string;
password?: string;
useMqtt?: boolean;
```
**Resultado**: No se serializaron (propiedades opcionales)

### 2. Hacer Campos Obligatorios ✅
```typescript
serverUrl: string;
username: string;
password: string;
useMqtt: boolean;
```
**Resultado**: No se serializaron (sin valores por defecto)

### 3. Agregar Valores por Defecto ✅
```typescript
serverUrl: string = '';
username: string = '';
password: string = '';
useMqtt: boolean = true;
```
**Resultado**: **AÚN no se serializan** ← Estado actual

### 4. Inicialización en onDeviceTypeChanged() ✅
```typescript
if (this.data.device.type === DeviceType.ThingsBoard) {
    this.data.device.property.serverUrl = '';
    this.data.device.property.username = '';
    ...
}
```
**Resultado**: Propiedades existen en el componente pero no se guardan en BD

---

## 🎯 Solución Temporal que Funciona

**Crear dispositivo manualmente con script**:

```bash
cd /home/jsalazar/FUXA/server
node create-thingsboard-device.js
```

Este script crea el dispositivo directamente en la BD con las propiedades correctas y **funciona perfectamente**.

---

## 🔍 Próximos Pasos para Resolver

### Opción 1: Investigar Serialización del Backend

Necesitamos encontrar dónde el backend serializa el dispositivo antes de guardarlo y por qué está eliminando las propiedades de ThingsBoard.

**Archivos a revisar**:
- `/server/runtime/project/index.js` - Manejo de guardado
- `/server/api/runtime/index.js` - API endpoints
- Buscar código que filtre o transforme `device.property`

### Opción 2: Usar un Objeto Separado para ThingsBoard

En lugar de extender `DeviceNetProperty`, crear una clase separada:

```typescript
export class ThingsBoardProperty {
    serverUrl: string = '';
    username: string = '';
    password: string = '';
    useMqtt: boolean = true;
}
```

Y en el componente:
```typescript
if (this.data.device.type === DeviceType.ThingsBoard) {
    this.data.device.property = new ThingsBoardProperty();
}
```

### Opción 3: Guardar en Campo Diferente

Guardar las propiedades de ThingsBoard en un campo separado en lugar de `property`:

```typescript
device.thingsBoardConfig = {
    serverUrl: '...',
    username: '...',
    ...
}
```

---

## 📋 Archivos Modificados

### Backend (1 archivo)
1. `/server/runtime/devices/device.js` - 5 cambios para agregar ThingsBoard
2. `/server/runtime/devices/thingsboard/` - Driver completo implementado

### Frontend (5 archivos)
1. `/client/src/app/_models/device.ts` - Agregado DeviceType.ThingsBoard y campos a DeviceNetProperty
2. `/client/src/app/device/device-map/device-map.component.ts` - ThingsBoard visible en lista
3. `/client/src/app/device/device-property/device-property.component.html` - Formulario agregado
4. `/client/src/app/device/device-property/device-property.component.ts` - Inicialización y logs
5. `/client/src/app/device/tag-property/tag-property-edit-thingsboard/*.ts` - Componente de tags

---

## 🎯 Workaround Actual

**Para usar ThingsBoard ahora**:

1. Edita `/server/create-thingsboard-device.js` con tus credenciales:
   ```javascript
   serverUrl: 'http://localhost:8080',
   username: 'tu_usuario@thingsboard.org',
   password: 'tu_password',
   useMqtt: false
   ```

2. Ejecuta el script:
   ```bash
   cd /home/jsalazar/FUXA/server
   node create-thingsboard-device.js
   ```

3. Reinicia el servidor:
   ```bash
   npm start
   ```

4. El dispositivo funcionará correctamente sin errores de MQTT

---

## 📊 Comparación

| Aspecto | Dispositivo Manual | Dispositivo desde UI |
|---------|-------------------|---------------------|
| Se crea | ✅ | ✅ |
| Aparece en lista | ✅ | ✅ |
| Propiedades en BD | ✅ Completas | ❌ Incompletas |
| serverUrl guardado | ✅ | ❌ |
| username guardado | ✅ | ❌ |
| useMqtt guardado | ✅ | ❌ |
| Se conecta | ✅ | ❌ (usa fallback) |
| MQTT respeta flag | ✅ | ❌ |

---

## 🐛 Debug Necesario

Para resolver completamente, necesitamos:

1. **Interceptar el guardado en el backend**:
   - Agregar logs en el endpoint que guarda dispositivos
   - Ver qué objeto recibe el backend
   - Ver qué objeto se guarda en la BD

2. **Verificar transformaciones**:
   - Buscar código que transforme `device.property`
   - Buscar whitelists o schemas de validación
   - Verificar si hay algún `Object.assign` o spread que filtre propiedades

3. **Comparar con otros tipos**:
   - Ver cómo se guardan dispositivos de otros tipos (OPCUA, Modbus, etc.)
   - Ver si tienen el mismo problema o si hay algo especial

---

## 💡 Conclusión

El driver ThingsBoard está **completamente funcional** cuando tiene las propiedades correctas. El único problema es que **el formulario no guarda las propiedades en la base de datos**.

Este es un problema de serialización/persistencia en el backend de FUXA, no un problema del driver de ThingsBoard.

**Solución inmediata**: Usar el script para crear dispositivos manualmente.

**Solución permanente**: Investigar y corregir el mecanismo de guardado en el backend.

---

**Fecha**: 2025-10-07  
**Estado**: Driver funcional, formulario parcialmente funcional  
**Bloqueador**: Propiedades no se persisten en BD desde el formulario
