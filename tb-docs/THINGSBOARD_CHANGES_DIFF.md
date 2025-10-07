# ThingsBoard Integration - Cambios Específicos (DIFF)

Este documento muestra exactamente qué líneas modificar en cada archivo.

---

## 1. Backend: `/server/runtime/devices/device.js`

### Cambio 1: Agregar import (después de línea 19)

```diff
  var WebCamClient = require('./webcam');
  var MELSECClient = require('./melsec');
+ var ThingsBoardClient = require('./thingsboard');
  
  const path = require('path');
```

### Cambio 2: Agregar case en constructor (después de línea 115)

```diff
  } else if (data.type === DeviceEnum.MELSEC) {
      if (!MELSECClient) {
          return null;
      }
      comm = MELSECClient.create(data, logger, events, manager, runtime);
+ } else if (data.type === DeviceEnum.ThingsBoard) {
+     if (!ThingsBoardClient) {
+         return null;
+     }
+     comm = ThingsBoardClient.create(data, logger, events, manager, runtime);
  }
  // else if (data.type === DeviceEnum.Template) {
```

### Cambio 3: Agregar soporte browse (después de línea 304)

```diff
  } else if (data.type === DeviceEnum.ODBC) {
      comm.browse(path, callback).then(function (result) {
          resolve(result);
      }).catch(function (err) {
          reject(err);
      });
+ } else if (data.type === DeviceEnum.ThingsBoard) {
+     comm.browse(path, callback).then(function (result) {
+         resolve(result);
+     }).catch(function (err) {
+         reject(err);
+     });
  } else {
      reject('Browse not supported!');
  }
```

### Cambio 4: Agregar a DeviceEnum (línea 573)

```diff
  var DeviceEnum = {
      S7: 'SiemensS7',
      OPCUA: 'OPCUA',
      ModbusRTU: 'ModbusRTU',
      ModbusTCP: 'ModbusTCP',
      BACnet: 'BACnet',
      WebAPI: 'WebAPI',
      MQTTclient: 'MQTTclient',
      EthernetIP: 'EthernetIP',
      FuxaServer: 'FuxaServer',
      ODBC: 'ODBC',
      ADSclient: 'ADSclient',
      GPIO: 'GPIO',
      internal: 'internal',
      WebCam: 'WebCam',
      MELSEC: 'MELSEC',
+     ThingsBoard: 'ThingsBoard'
      // Template: 'template'
  }
```

### Cambio 5: Agregar a loadPlugin (después de línea 532)

```diff
  } else if (type === DeviceEnum.MELSEC) {
      MELSECClient = require(module);
+ } else if (type === DeviceEnum.ThingsBoard) {
+     ThingsBoardClient = require(module);
  }
```

---

## 2. Frontend: `/client/src/app/_models/device.ts`

### Cambio 1: Agregar a DeviceType enum (línea 248)

```diff
  export enum DeviceType {
      FuxaServer = 'FuxaServer',
      SiemensS7 = 'SiemensS7',
      OPCUA = 'OPCUA',
      BACnet = 'BACnet',
      ModbusRTU = 'ModbusRTU',
      ModbusTCP = 'ModbusTCP',
      WebAPI = 'WebAPI',
      MQTTclient = 'MQTTclient',
      internal = 'internal',
      EthernetIP = 'EthernetIP',
      ODBC = 'ODBC',
      ADSclient = 'ADSclient',
      GPIO = 'GPIO',
      WebCam = 'WebCam',
-     MELSEC = 'MELSEC'
+     MELSEC = 'MELSEC',
+     ThingsBoard = 'ThingsBoard'
      // Template: 'template'
  }
```

### Cambio 2: Actualizar descriptor (línea 42)

```diff
  static descriptor = {
      id: 'Device id, GUID',
      name: 'Device name',
      enabled: 'Enabled',
-     type: 'Device Type: FuxaServer | SiemensS7 | OPCUA | BACnet | ModbusRTU | ModbusTCP | WebAPI | MQTTclient | internal | EthernetIP | ADSclient | Gpio | WebCam | MELSEC',
+     type: 'Device Type: FuxaServer | SiemensS7 | OPCUA | BACnet | ModbusRTU | ModbusTCP | WebAPI | MQTTclient | internal | EthernetIP | ADSclient | Gpio | WebCam | MELSEC | ThingsBoard',
      polling: 'Polling interval in millisec., check changed value after ask value, by OPCUA there is a monitor',
      property: 'Connection property depending of type',
      tags: 'Tags list of Tag',
  };
```

---

## 3. Frontend: Registrar componentes en módulo

### Archivo: `/client/src/app/device/device.module.ts` (o similar)

Si no existe un módulo específico, buscar en el módulo principal donde se declaran los componentes de device.

```diff
  import { DeviceListComponent } from './device-list/device-list.component';
  import { DeviceMapComponent } from './device-map/device-map.component';
  import { DevicePropertyComponent } from './device-property/device-property.component';
+ import { DevicePropertyThingsboardComponent } from './device-property/device-property-thingsboard/device-property-thingsboard.component';
  import { TagPropertyComponent } from './tag-property/tag-property.component';
+ import { TagPropertyEditThingsboardComponent } from './tag-property/tag-property-edit-thingsboard/tag-property-edit-thingsboard.component';

  @NgModule({
    declarations: [
      DeviceComponent,
      DeviceListComponent,
      DeviceMapComponent,
      DevicePropertyComponent,
+     DevicePropertyThingsboardComponent,
      TagPropertyComponent,
+     TagPropertyEditThingsboardComponent,
      // ... otros componentes
    ],
```

---

## 4. Frontend: Agregar icono y soporte en device-map

### Archivo: `/client/src/app/device/device-map/device-map.component.ts`

Buscar donde se definen los iconos de dispositivos y agregar:

```diff
  getDeviceIcon(deviceType: string): string {
      switch (deviceType) {
          case DeviceType.SiemensS7:
              return 'assets/icons/s7.svg';
          case DeviceType.OPCUA:
              return 'assets/icons/opcua.svg';
          // ... otros casos
+         case DeviceType.ThingsBoard:
+             return 'assets/icons/thingsboard.svg';
          default:
              return 'assets/icons/device.svg';
      }
  }
```

---

## 5. Frontend: Integrar componente de propiedades

### Archivo: `/client/src/app/device/device-property/device-property.component.html`

Buscar donde se muestran los diferentes formularios según el tipo de dispositivo:

```diff
  <div [ngSwitch]="device.type">
      <app-device-property-s7 *ngSwitchCase="'SiemensS7'" [device]="device"></app-device-property-s7>
      <app-device-property-opcua *ngSwitchCase="'OPCUA'" [device]="device"></app-device-property-opcua>
      <!-- ... otros casos -->
+     <app-device-property-thingsboard *ngSwitchCase="'ThingsBoard'" [device]="device" (result)="onResult($event)"></app-device-property-thingsboard>
      <app-device-property-default *ngSwitchDefault [device]="device"></app-device-property-default>
  </div>
```

---

## 6. Frontend: Integrar componente de tags

### Archivo: `/client/src/app/device/tag-property/tag-property.component.html`

Buscar donde se muestran los diferentes editores de tags:

```diff
  <div [ngSwitch]="device.type">
      <app-tag-property-edit-opcua *ngSwitchCase="'OPCUA'" [device]="device" [tag]="tag"></app-tag-property-edit-opcua>
      <app-tag-property-edit-mqtt *ngSwitchCase="'MQTTclient'" [device]="device" [tag]="tag"></app-tag-property-edit-mqtt>
      <!-- ... otros casos -->
+     <app-tag-property-edit-thingsboard *ngSwitchCase="'ThingsBoard'" [device]="device" [tag]="tag" (result)="onResult($event)"></app-tag-property-edit-thingsboard>
      <app-tag-property-edit-default *ngSwitchDefault [device]="device" [tag]="tag"></app-tag-property-edit-default>
  </div>
```

---

## 7. Frontend: Agregar a lista de tipos de dispositivos

### Archivo: Buscar donde se define la lista de tipos disponibles

Puede estar en un servicio o en el componente de creación de dispositivos:

```diff
  deviceTypes = [
      { value: DeviceType.FuxaServer, label: 'FUXA Server', icon: 'server' },
      { value: DeviceType.SiemensS7, label: 'Siemens S7', icon: 's7' },
      { value: DeviceType.OPCUA, label: 'OPC UA', icon: 'opcua' },
      { value: DeviceType.ModbusTCP, label: 'Modbus TCP', icon: 'modbus' },
      { value: DeviceType.ModbusRTU, label: 'Modbus RTU', icon: 'modbus' },
      { value: DeviceType.BACnet, label: 'BACnet', icon: 'bacnet' },
      { value: DeviceType.WebAPI, label: 'Web API', icon: 'web' },
      { value: DeviceType.MQTTclient, label: 'MQTT Client', icon: 'mqtt' },
      { value: DeviceType.EthernetIP, label: 'EtherNet/IP', icon: 'ethernet' },
      { value: DeviceType.ODBC, label: 'ODBC', icon: 'database' },
      { value: DeviceType.ADSclient, label: 'ADS Client', icon: 'ads' },
      { value: DeviceType.GPIO, label: 'GPIO', icon: 'gpio' },
      { value: DeviceType.WebCam, label: 'WebCam', icon: 'camera' },
      { value: DeviceType.MELSEC, label: 'MELSEC', icon: 'melsec' },
+     { value: DeviceType.ThingsBoard, label: 'ThingsBoard', icon: 'thingsboard' }
  ];
```

---

## Resumen de Archivos a Modificar

### Backend (2 archivos)
1. ✅ `/server/runtime/devices/device.js` - 5 cambios
2. ✅ `/server/runtime/devices/thingsboard/*` - Ya existe

### Frontend (5-7 archivos)
1. ✅ `/client/src/app/_models/device.ts` - 2 cambios
2. 📋 `/client/src/app/device/device.module.ts` - Agregar imports y declarations
3. 📋 `/client/src/app/device/device-property/device-property-thingsboard/*` - Crear componente
4. 📋 `/client/src/app/device/device-property/device-property.component.html` - Agregar case
5. 📋 `/client/src/app/device/tag-property/tag-property.component.html` - Agregar case
6. 📋 `/client/src/app/device/device-map/device-map.component.ts` - Agregar icono
7. 📋 Archivo de tipos de dispositivos - Agregar a lista

---

## Verificación de Cambios

### Backend
```bash
# Buscar referencias a ThingsBoard
cd server
grep -r "ThingsBoard" runtime/devices/device.js

# Debería mostrar:
# - var ThingsBoardClient = require('./thingsboard');
# - } else if (data.type === DeviceEnum.ThingsBoard) {
# - ThingsBoard: 'ThingsBoard'
```

### Frontend
```bash
# Buscar referencias a ThingsBoard
cd client/src/app
grep -r "ThingsBoard" _models/device.ts

# Debería mostrar:
# - ThingsBoard = 'ThingsBoard'
```

---

## Testing de Cambios

### 1. Compilar Backend
```bash
cd server
npm start
# Verificar que no hay errores de sintaxis
# Buscar en logs: "ThingsBoard" o errores relacionados
```

### 2. Compilar Frontend
```bash
cd client
npm run build
# Verificar que no hay errores de compilación
# Verificar que DeviceType.ThingsBoard está disponible
```

### 3. Test Manual
1. Abrir FUXA en navegador
2. Ir a Devices
3. Click en "Add Device"
4. Verificar que "ThingsBoard" aparece en la lista de tipos
5. Seleccionar ThingsBoard
6. Verificar que aparece el formulario de configuración

---

## Rollback (Si algo sale mal)

### Backend
```bash
cd server
git checkout runtime/devices/device.js
```

### Frontend
```bash
cd client
git checkout src/app/_models/device.ts
```

---

**Nota**: Este documento muestra solo los cambios mínimos necesarios para que el driver funcione. Los componentes de UI (device-property-thingsboard y tag-property-edit-thingsboard) deben crearse según la guía de implementación.

---

**Versión**: 1.0  
**Fecha**: 2025-10-07
