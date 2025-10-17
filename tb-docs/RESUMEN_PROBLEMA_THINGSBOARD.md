# 🔍 Resumen del Problema ThingsBoard - Diagnóstico Completo

## 📊 Estado Actual

### ✅ Lo que SÍ funciona:
1. ✅ Driver ThingsBoard implementado y funcional
2. ✅ ThingsBoard aparece en la lista de tipos de dispositivos
3. ✅ Formulario se muestra con los campos correctos
4. ✅ Driver se conecta cuando usa valores hardcodeados
5. ✅ Frontend compila sin errores
6. ✅ Campos agregados a `DeviceNetProperty`

### ❌ Lo que NO funciona:
1. ❌ **Las propiedades NO se guardan en la base de datos**
2. ❌ **El driver usa valores fallback en lugar de los ingresados**
3. ❌ **Los logs de debug NO aparecen** (método `load()` no se llama)
4. ❌ **MQTT intenta conectarse** aunque esté desactivado

---

## 🐛 Problema Raíz Identificado

**El formulario NO está guardando las propiedades en la base de datos.**

### Evidencia:

1. **Logs muestran**:
   ```
   [WAR] 'oopp' serverUrl is empty, using localhost:8080 for testing
   ```
   Esto significa que `data.property.serverUrl` está vacío.

2. **Base de datos vacía**:
   ```bash
   $ node -e "..." # Query a la BD
   Device not found
   ```
   Los dispositivos no se están guardando.

3. **Logs de debug NO aparecen**:
   Los logs que agregamos (`ThingsBoard load() called`, `property keys`, etc.) NO se muestran, lo que significa que el método `load()` no se está llamando o el dispositivo no se está cargando.

---

## 🔍 Análisis del Flujo

### Flujo Esperado:
```
1. Usuario abre formulario
2. Usuario selecciona "ThingsBoard"
3. onDeviceTypeChanged() inicializa property
4. Usuario ingresa valores en campos
5. Campos hacen binding a data.device.property.*
6. Usuario click OK
7. onOkClick() se ejecuta
8. Dispositivo se guarda en BD
9. Servidor carga dispositivo
10. load() se llama con data.property
11. Driver usa los valores
```

### Flujo Actual (Roto):
```
1. Usuario abre formulario ✅
2. Usuario selecciona "ThingsBoard" ✅
3. onDeviceTypeChanged() inicializa property ✅ (pero no se persiste)
4. Usuario ingresa valores en campos ✅
5. Campos hacen binding ❓ (no confirmado)
6. Usuario click OK ✅
7. onOkClick() se ejecuta ❓ (solo guarda security)
8. Dispositivo se guarda en BD ❌ (NO se guarda o se guarda sin property)
9. Servidor carga dispositivo ❌ (property está vacío)
10. load() se llama ❌ (no se ve en logs)
11. Driver usa fallback ✅
```

---

## 🎯 Posibles Causas

### Causa 1: Property no se inicializa correctamente
- `onDeviceTypeChanged()` se ejecuta pero `data.device.property` no se crea
- Solución: Verificar que el código se ejecuta

### Causa 2: Binding no funciona
- Los campos del formulario no están haciendo binding a `data.device.property`
- Solución: Verificar el HTML del formulario

### Causa 3: Property no se guarda en BD
- El dispositivo se guarda pero sin el objeto `property`
- Solución: Verificar el método de guardado

### Causa 4: Caché del navegador
- El navegador usa código antiguo
- Solución: Hard refresh, modo incógnito (YA PROBADO)

---

## 🔧 Solución Propuesta

### Paso 1: Verificar que el código TypeScript se ejecuta

Agregar console.log en el componente para verificar:

```typescript
onDeviceTypeChanged() {
    // ... código existente ...
    
    if (this.data.device.type === DeviceType.ThingsBoard) {
        console.log('ThingsBoard selected, initializing property');
        console.log('Before:', this.data.device.property);
        
        if (!this.data.device.property) {
            this.data.device.property = {};
        }
        this.data.device.property.serverUrl = this.data.device.property.serverUrl || '';
        this.data.device.property.username = this.data.device.property.username || '';
        this.data.device.property.password = this.data.device.property.password || '';
        this.data.device.property.useMqtt = this.data.device.property.useMqtt !== undefined ? this.data.device.property.useMqtt : true;
        
        console.log('After:', this.data.device.property);
    }
}
```

### Paso 2: Verificar el binding en el HTML

El HTML actual:
```html
<input [(ngModel)]="data.device.property.serverUrl" ...>
```

Debe hacer binding correctamente. Agregar evento para verificar:
```html
<input [(ngModel)]="data.device.property.serverUrl" 
       (ngModelChange)="onServerUrlChange($event)" ...>
```

Y en el TS:
```typescript
onServerUrlChange(value: string) {
    console.log('serverUrl changed to:', value);
    console.log('property object:', this.data.device.property);
}
```

### Paso 3: Verificar onOkClick

Modificar `onOkClick()` para asegurar que property se guarda:

```typescript
onOkClick(): void {
    this.data.security = this.getSecurity();
    
    // DEBUG: Log property before saving
    if (this.data.device.type === DeviceType.ThingsBoard) {
        console.log('Saving ThingsBoard device');
        console.log('Property:', JSON.stringify(this.data.device.property));
    }
}
```

### Paso 4: Verificar que se guarda en BD

Después de guardar, verificar en la BD:
```bash
node -e "const sqlite3 = require('sqlite3'); const db = new sqlite3.Database('_appdata/project.fuxap.db'); db.all('SELECT * FROM devices', (err, rows) => { rows.forEach(row => { if (row.data) { const device = JSON.parse(row.data); if (device.type === 'ThingsBoard') { console.log('Device:', device.name); console.log('Property:', JSON.stringify(device.property, null, 2)); } } }); db.close(); });"
```

---

## 🚀 Solución Temporal (Workaround)

Mientras arreglamos el formulario, puedes crear el dispositivo manualmente en la BD:

```javascript
// Ejecutar en la consola del navegador (DevTools)
const device = {
    id: 'tb_' + Date.now(),
    name: 'ThingsBoard Local',
    type: 'ThingsBoard',
    enabled: true,
    polling: 5000,
    property: {
        serverUrl: 'http://localhost:8080',
        username: 'tu_usuario@thingsboard.org',
        password: 'tu_password',
        useMqtt: false  // Desactivar MQTT
    },
    tags: {}
};

// Guardar vía API
fetch('/api/projectData', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cmd: 'set', type: 'devices', data: device })
});
```

---

## 📋 Checklist de Debugging

### Frontend
- [ ] Abrir DevTools (F12) → Console
- [ ] Crear dispositivo ThingsBoard
- [ ] Verificar console.logs de `onDeviceTypeChanged()`
- [ ] Ingresar valores en campos
- [ ] Verificar console.logs de cambios
- [ ] Click OK
- [ ] Verificar console.logs de `onOkClick()`
- [ ] Verificar que no hay errores en Console

### Backend
- [ ] Verificar logs del servidor
- [ ] Buscar `ThingsBoard load() called`
- [ ] Buscar `property keys:`
- [ ] Buscar `serverUrl is empty`
- [ ] Verificar errores de conexión

### Base de Datos
- [ ] Query a la BD después de guardar
- [ ] Verificar que el dispositivo existe
- [ ] Verificar que property tiene valores
- [ ] Verificar que serverUrl no está vacío

---

## 🎯 Próximo Paso Inmediato

**Agregar console.logs en el componente TypeScript** para ver exactamente qué está pasando cuando:
1. Se selecciona ThingsBoard
2. Se ingresan valores
3. Se hace click en OK

Esto nos dirá si el problema es:
- El código no se ejecuta
- El binding no funciona
- El guardado falla

---

**¿Quieres que agregue los console.logs de debugging al componente?**
