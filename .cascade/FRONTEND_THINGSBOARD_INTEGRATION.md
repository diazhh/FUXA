# Frontend Integration - ThingsBoard Tags On-Demand

## ✅ Problema Resuelto

### Síntoma:
- Tag Selection mostraba devices de ThingsBoard como "FUXA Server"
- Solo aparecía "Connection Status" 
- **NO** aparecían los telemetry keys (presion, nivel, etc.)

### Causa Raíz:
El Tag Selection solo consultaba devices del proyecto (`projectService.getDevices()`), pero los devices de ThingsBoard **NO están en el proyecto** porque ahora usamos arquitectura directa sin almacenamiento local.

---

## 🔧 Solución Implementada

### Modificación: Tag Selection Component

**Archivo:** `/client/src/app/device/device-tag-selection/device-tag-selection.component.ts`

#### Cambio 1: Import HttpClient
```typescript
import { HttpClient } from '@angular/common/http';
```

#### Cambio 2: Inyectar HttpClient en constructor
```typescript
constructor(
    public dialogRef: MatDialogRef<DeviceTagSelectionComponent>,
    private projectService: ProjectService,
    private tagPropertyService: TagPropertyService,
    private http: HttpClient,  // ← AGREGADO
    @Inject(MAT_DIALOG_DATA) public data: DeviceTagSelectionData
) {
    this.loadDevicesTags();
}
```

#### Cambio 3: Método `loadDevicesTags` ahora es async y consulta ThingsBoard

**ANTES:**
```typescript
private loadDevicesTags(newTag?: Tag, deviceName?: string) {
    this.tags = [];
    this.devices = Object.values(this.projectService.getDevices());
    // Solo cargaba devices del proyecto
    // ...
}
```

**DESPUÉS:**
```typescript
private async loadDevicesTags(newTag?: Tag, deviceName?: string) {
    this.tags = [];
    this.devices = Object.values(this.projectService.getDevices());
    
    // 1. Load tags from project devices (Modbus, OPC UA, etc.)
    if (this.devices) {
        this.devices.forEach((device: Device) => {
            // ... código existente ...
        });
    }
    
    // 2. Load tags from ThingsBoard devices (on-demand query) ← NUEVO
    try {
        const tbDevices: any[] = await this.http.get<any[]>('/api/thingsboard/devices').toPromise();
        if (tbDevices && tbDevices.length > 0) {
            // For each ThingsBoard device, fetch its telemetry keys
            for (const tbDevice of tbDevices) {
                const deviceId = tbDevice.id.id;
                const deviceName = tbDevice.name;
                
                try {
                    const keys: string[] = await this.http.get<string[]>(`/api/thingsboard/device/${deviceId}/keys`).toPromise();
                    if (keys && keys.length > 0) {
                        // Create a tag for each telemetry key
                        keys.forEach((key: string) => {
                            this.tags.push(<TagElement> {
                                id: `tb:${deviceId}:${key}`,
                                name: key,
                                address: deviceId,
                                device: `TB:${deviceName}`,
                                checked: false,
                                error: null
                            });
                        });
                    }
                } catch (err) {
                    console.error(`Failed to load telemetry keys for device ${deviceName}:`, err);
                }
            }
        }
    } catch (err) {
        console.error('Failed to load ThingsBoard devices:', err);
    }
    
    this.dataSource.data = this.tags;
    // ...
}
```

---

## 🔄 Flujo de Carga de Tags

### ANTES (Incorrecto):
```
1. Tag Selection abre
2. Consulta projectService.getDevices()
3. Solo obtiene devices del proyecto (Modbus, OPC UA, etc.)
4. ThingsBoard devices NO aparecen ❌
```

### DESPUÉS (Correcto):
```
1. Tag Selection abre
2. Consulta projectService.getDevices() → Devices del proyecto
3. Consulta /api/thingsboard/devices → 17 devices de TB
4. Para cada device TB:
   a. Consulta /api/thingsboard/device/{id}/keys
   b. Obtiene telemetry keys (ej: ["presion", "nivel"])
   c. Crea un TagElement por cada key
5. Muestra todos los tags disponibles ✅
```

---

## 📊 Formato de Tags de ThingsBoard

### Tag ID:
```
tb:{deviceId}:{telemetryKey}
```

**Ejemplo:**
```
tb:a65008a0-a848-11f0-aabd-5b2d2a47a78c:presion
tb:a65008a0-a848-11f0-aabd-5b2d2a47a78c:nivel
```

### Tag Element:
```typescript
{
    id: "tb:a65008a0-a848-11f0-aabd-5b2d2a47a78c:presion",
    name: "presion",
    address: "a65008a0-a848-11f0-aabd-5b2d2a47a78c",
    device: "TB:test01",
    checked: false,
    error: null
}
```

**Campos:**
- `id`: Identificador único con formato `tb:{deviceId}:{key}`
- `name`: Nombre del telemetry key (ej: "presion")
- `address`: Device ID de ThingsBoard
- `device`: Nombre del device con prefijo "TB:" para distinguirlo
- `checked`: Si está seleccionado
- `error`: Errores si los hay

---

## 🎯 Resultado Esperado en Tag Selection

### Devices del Proyecto:
```
Name                    | Address | Connections  | Type
------------------------|---------|--------------|-------
Connection Status       |         | FUXA Server  | ✓
```

### Devices de ThingsBoard (NUEVO):
```
Name                    | Address                              | Connections  | Type
------------------------|--------------------------------------|--------------|-------
presion                 | a65008a0-a848-11f0-aabd-5b2d2a47a78c | TB:test01    | ✓
nivel                   | a65008a0-a848-11f0-aabd-5b2d2a47a78c | TB:test01    | ✓
temperature             | abc123...                            | TB:test02    | ✓
humidity                | abc123...                            | TB:test02    | ✓
...
```

**Total esperado:** 
- 1 tag de FUXA Server (Connection Status)
- ~34+ tags de ThingsBoard (17 devices × ~2 telemetry keys cada uno)

---

## 🧪 Verificación

### 1. Abrir FUXA
```
http://localhost:1881
```

### 2. Ir al Editor
- Click en "Editor" en el menú

### 3. Agregar un elemento
- Agregar un Text, Gauge, o cualquier elemento que use tags

### 4. Abrir Tag Selection
- Click en el botón de Tag Selection

### 5. Verificar que aparecen:
- ✅ Tags de FUXA Server (Connection Status)
- ✅ Tags de ThingsBoard con prefijo "TB:" en la columna Connections
- ✅ Telemetry keys como nombres de tags (presion, nivel, temperature, etc.)

### 6. Verificar logs del navegador (F12 → Console)
**Logs esperados:**
```
(ningún error)
```

**Si hay errores:**
```
Failed to load ThingsBoard devices: ...
Failed to load telemetry keys for device ...: ...
```

### 7. Verificar Network tab (F12 → Network)
**Requests esperados:**
```
GET /api/thingsboard/devices → 200 OK (retorna 17 devices)
GET /api/thingsboard/device/{id}/keys → 200 OK (retorna ["presion", "nivel"])
GET /api/thingsboard/device/{id}/keys → 200 OK (retorna telemetry keys)
... (una request por cada device)
```

---

## 📝 Archivos Modificados

### Frontend:
1. `/client/src/app/device/device-tag-selection/device-tag-selection.component.ts`
   - Import HttpClient
   - Inyectar HttpClient en constructor
   - Modificar `loadDevicesTags()` para consultar ThingsBoard on-demand

### Build:
```bash
cd /home/jsalazar-fcore/FUXA/client
npm run build
```

---

## 🎉 Beneficios de la Implementación

### ✅ Arquitectura Correcta:
1. **Sin Almacenamiento Local** - ThingsBoard devices NO están en el proyecto
2. **Consulta On-Demand** - Tags se cargan cuando se abre Tag Selection
3. **Fuente Única de Verdad** - ThingsBoard es la única fuente de devices y telemetría
4. **Tiempo Real** - Cada vez que se abre Tag Selection, se consultan los datos actuales

### ✅ Experiencia de Usuario:
1. **Tags Visibles** - Telemetry keys aparecen como tags disponibles
2. **Identificación Clara** - Prefijo "TB:" distingue devices de ThingsBoard
3. **Sin Configuración** - No requiere agregar devices manualmente
4. **Automático** - Nuevos devices en ThingsBoard aparecen automáticamente

### ✅ Cumple con las Reglas:
1. ✅ **Conexión Directa** - Consulta directa a ThingsBoard API
2. ✅ **Sin Base de Datos Local** - NO almacena devices ni telemetría
3. ✅ **Telemetría como Tags** - Telemetry keys son los tags disponibles
4. ✅ **Tiempo Real** - Cada consulta obtiene datos actuales
5. ✅ **Fuente Única de Verdad** - ThingsBoard es la única fuente

---

## 🚀 Próximos Pasos

### 1. Verificar Tag Selection
- Abrir Tag Selection y verificar que aparecen tags de ThingsBoard

### 2. Implementar Lectura de Valores
Cuando se use un tag de ThingsBoard en el editor, necesitamos:
- Detectar que el tag ID tiene formato `tb:{deviceId}:{key}`
- Consultar `/api/thingsboard/device/{deviceId}/telemetry?keys={key}`
- Mostrar el valor actual

### 3. Implementar Escritura de Valores
Cuando se escriba a un tag de ThingsBoard:
- Detectar formato `tb:{deviceId}:{key}`
- Enviar POST a `/api/thingsboard/device/{deviceId}/telemetry`
- Con body: `{"{key}": value}`

---

**Estado Actual:** ✅ Tag Selection muestra telemetry keys de ThingsBoard on-demand

**Siguiente:** Implementar lectura/escritura de valores en tiempo real
