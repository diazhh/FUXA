# Guía de Implementación - Driver ThingsBoard para FUXA

## Índice

1. [Cambios en Backend](#cambios-en-backend)
2. [Cambios en Frontend](#cambios-en-frontend)
3. [Componentes a Crear](#componentes-a-crear)
4. [Testing](#testing)
5. [Checklist de Implementación](#checklist-de-implementación)

---

## Cambios en Backend

### 1. Modificar `/server/runtime/devices/device.js`

#### Cambio 1: Agregar import (línea ~19)

**Ubicación**: Después de `var MELSECClient = require('./melsec');`

```javascript
var ThingsBoardClient = require('./thingsboard');
```

#### Cambio 2: Agregar case en constructor (línea ~116)

**Ubicación**: Después del bloque de MELSEC

```javascript
} else if (data.type === DeviceEnum.MELSEC) {
    if (!MELSECClient) {
        return null;
    }
    comm = MELSECClient.create(data, logger, events, manager, runtime);
} else if (data.type === DeviceEnum.ThingsBoard) {
    if (!ThingsBoardClient) {
        return null;
    }
    comm = ThingsBoardClient.create(data, logger, events, manager, runtime);
}
```

#### Cambio 3: Agregar soporte browse (línea ~305)

**Ubicación**: Después del bloque de ODBC en la función browse

```javascript
} else if (data.type === DeviceEnum.ODBC) {
    comm.browse(path, callback).then(function (result) {
        resolve(result);
    }).catch(function (err) {
        reject(err);
    });
} else if (data.type === DeviceEnum.ThingsBoard) {
    comm.browse(path, callback).then(function (result) {
        resolve(result);
    }).catch(function (err) {
        reject(err);
    });
} else {
    reject('Browse not supported!');
}
```

#### Cambio 4: Agregar a DeviceEnum (línea ~573)

**Ubicación**: En el objeto DeviceEnum

```javascript
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
    ThingsBoard: 'ThingsBoard'
}
```

#### Cambio 5: Agregar a loadPlugin (línea ~532)

**Ubicación**: Después del case de MELSEC

```javascript
} else if (type === DeviceEnum.MELSEC) {
    MELSECClient = require(module);
} else if (type === DeviceEnum.ThingsBoard) {
    ThingsBoardClient = require(module);
}
```

---

## Cambios en Frontend

### 1. Modificar `/client/src/app/_models/device.ts`

#### Cambio 1: Agregar a DeviceType enum (línea ~248)

**Ubicación**: En el enum DeviceType

```typescript
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
    MELSEC = 'MELSEC',
    ThingsBoard = 'ThingsBoard'
}
```

#### Cambio 2: Actualizar descriptor (línea ~42)

**Ubicación**: En Device.descriptor.type

```typescript
static descriptor = {
    id: 'Device id, GUID',
    name: 'Device name',
    enabled: 'Enabled',
    type: 'Device Type: FuxaServer | SiemensS7 | OPCUA | BACnet | ModbusRTU | ModbusTCP | WebAPI | MQTTclient | internal | EthernetIP | ADSclient | Gpio | WebCam | MELSEC | ThingsBoard',
    polling: 'Polling interval in millisec., check changed value after ask value, by OPCUA there is a monitor',
    property: 'Connection property depending of type',
    tags: 'Tags list of Tag',
};
```

---

## Componentes a Crear

### 1. Componente de Propiedades del Dispositivo

**Archivo**: `/client/src/app/device/device-property/device-property-thingsboard/device-property-thingsboard.component.ts`

```typescript
import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { Device } from '../../../_models/device';

@Component({
    selector: 'app-device-property-thingsboard',
    templateUrl: './device-property-thingsboard.component.html',
    styleUrls: ['./device-property-thingsboard.component.scss']
})
export class DevicePropertyThingsboardComponent implements OnInit {

    @Input() device: Device;
    @Output() result = new EventEmitter<any>();

    // Form fields
    serverUrl: string = '';
    username: string = '';
    password: string = '';
    useMqtt: boolean = true;

    // UI state
    testing: boolean = false;
    testResult: string = '';
    testSuccess: boolean = false;

    constructor() { }

    ngOnInit() {
        if (this.device.property) {
            this.serverUrl = this.device.property.serverUrl || this.device.property.address || '';
            this.username = this.device.property.username || '';
            this.password = this.device.property.password || '';
            this.useMqtt = this.device.property.useMqtt !== false;
        }
    }

    onTestConnection() {
        this.testing = true;
        this.testResult = '';
        this.testSuccess = false;

        // TODO: Implement test connection via HmiService
        // For now, just validate fields
        if (!this.serverUrl || !this.username || !this.password) {
            this.testResult = 'Please fill all required fields';
            this.testSuccess = false;
            this.testing = false;
            return;
        }

        // Simulate test
        setTimeout(() => {
            this.testResult = 'Connection test not implemented yet';
            this.testSuccess = false;
            this.testing = false;
        }, 1000);
    }

    onSave() {
        if (!this.device.property) {
            this.device.property = {};
        }

        this.device.property.serverUrl = this.serverUrl;
        this.device.property.address = this.serverUrl; // For compatibility
        this.device.property.username = this.username;
        this.device.property.password = this.password;
        this.device.property.useMqtt = this.useMqtt;

        this.result.emit({ device: this.device });
    }

    onCancel() {
        this.result.emit({ cancel: true });
    }
}
```

**Archivo**: `/client/src/app/device/device-property/device-property-thingsboard/device-property-thingsboard.component.html`

```html
<div class="device-property-container">
    <h3>ThingsBoard Connection Settings</h3>

    <div class="form-group">
        <label for="serverUrl">Server URL *</label>
        <input 
            type="text" 
            id="serverUrl" 
            [(ngModel)]="serverUrl" 
            placeholder="http://localhost:8080"
            class="form-control">
        <small class="form-text text-muted">
            ThingsBoard server URL (e.g., http://demo.thingsboard.io)
        </small>
    </div>

    <div class="form-group">
        <label for="username">Username *</label>
        <input 
            type="text" 
            id="username" 
            [(ngModel)]="username" 
            placeholder="tenant@thingsboard.org"
            class="form-control">
        <small class="form-text text-muted">
            ThingsBoard user email
        </small>
    </div>

    <div class="form-group">
        <label for="password">Password *</label>
        <input 
            type="password" 
            id="password" 
            [(ngModel)]="password" 
            placeholder="••••••••"
            class="form-control">
    </div>

    <div class="form-group">
        <label>
            <input 
                type="checkbox" 
                [(ngModel)]="useMqtt">
            Use MQTT for real-time telemetry
        </label>
        <small class="form-text text-muted">
            Enable MQTT for faster updates (recommended)
        </small>
    </div>

    <div class="test-connection">
        <button 
            class="btn btn-secondary" 
            (click)="onTestConnection()"
            [disabled]="testing">
            <span *ngIf="!testing">Test Connection</span>
            <span *ngIf="testing">Testing...</span>
        </button>
        <span *ngIf="testResult" 
              [class.text-success]="testSuccess"
              [class.text-danger]="!testSuccess">
            {{ testResult }}
        </span>
    </div>

    <div class="form-actions">
        <button class="btn btn-primary" (click)="onSave()">Save</button>
        <button class="btn btn-secondary" (click)="onCancel()">Cancel</button>
    </div>
</div>
```

**Archivo**: `/client/src/app/device/device-property/device-property-thingsboard/device-property-thingsboard.component.scss`

```scss
.device-property-container {
    padding: 20px;

    h3 {
        margin-bottom: 20px;
        color: #333;
    }

    .form-group {
        margin-bottom: 20px;

        label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
            color: #555;
        }

        .form-control {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;

            &:focus {
                outline: none;
                border-color: #4CAF50;
                box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.1);
            }
        }

        .form-text {
            display: block;
            margin-top: 5px;
            font-size: 12px;
            color: #888;
        }
    }

    .test-connection {
        margin: 20px 0;
        display: flex;
        align-items: center;
        gap: 10px;

        .btn {
            padding: 8px 16px;
        }

        .text-success {
            color: #4CAF50;
        }

        .text-danger {
            color: #f44336;
        }
    }

    .form-actions {
        margin-top: 30px;
        display: flex;
        gap: 10px;

        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.2s;

            &.btn-primary {
                background-color: #4CAF50;
                color: white;

                &:hover {
                    background-color: #45a049;
                }
            }

            &.btn-secondary {
                background-color: #757575;
                color: white;

                &:hover {
                    background-color: #616161;
                }

                &:disabled {
                    background-color: #bdbdbd;
                    cursor: not-allowed;
                }
            }
        }
    }
}
```

### 2. Actualizar HTML del componente de tags existente

**Archivo**: `/client/src/app/device/tag-property/tag-property-edit-thingsboard/tag-property-edit-thingsboard.component.html`

```html
<div class="thingsboard-tag-editor">
    <h3>ThingsBoard Device Browser</h3>

    <div *ngIf="loading" class="loading">
        <mat-spinner diameter="40"></mat-spinner>
        <span>Loading...</span>
    </div>

    <div *ngIf="error" class="error-message">
        <mat-icon>error</mat-icon>
        <span>{{ error }}</span>
        <button mat-button (click)="onRefresh()">Retry</button>
    </div>

    <div *ngIf="!loading && !error" class="browser-content">
        <!-- Device Selection -->
        <div class="device-selection">
            <h4>Select Device</h4>
            <mat-form-field appearance="outline" class="full-width">
                <mat-label>ThingsBoard Device</mat-label>
                <mat-select [(value)]="selectedDevice" (selectionChange)="onDeviceSelected($event.value)">
                    <mat-option *ngFor="let device of devices" [value]="device">
                        {{ getDeviceDisplayName(device) }}
                    </mat-option>
                </mat-select>
            </mat-form-field>
        </div>

        <!-- Telemetry Keys Table -->
        <div *ngIf="selectedDevice" class="telemetry-table">
            <h4>Select Telemetry Keys</h4>
            
            <table mat-table [dataSource]="dataSource" class="mat-elevation-z2">
                <!-- Checkbox Column -->
                <ng-container matColumnDef="select">
                    <th mat-header-cell *matHeaderCellDef>
                        <mat-checkbox 
                            (change)="$event ? masterToggle() : null"
                            [checked]="selection.hasValue() && isAllSelected()"
                            [indeterminate]="selection.hasValue() && !isAllSelected()">
                        </mat-checkbox>
                    </th>
                    <td mat-cell *matCellDef="let row">
                        <mat-checkbox 
                            (click)="$event.stopPropagation()"
                            (change)="$event ? selection.toggle(row) : null"
                            [checked]="selection.isSelected(row)">
                        </mat-checkbox>
                    </td>
                </ng-container>

                <!-- Name Column -->
                <ng-container matColumnDef="name">
                    <th mat-header-cell *matHeaderCellDef>Name</th>
                    <td mat-cell *matCellDef="let element">{{ element.name }}</td>
                </ng-container>

                <!-- Type Column -->
                <ng-container matColumnDef="type">
                    <th mat-header-cell *matHeaderCellDef>Type</th>
                    <td mat-cell *matCellDef="let element">
                        <mat-form-field appearance="outline" class="type-select">
                            <mat-select [(value)]="element.type">
                                <mat-option *ngFor="let type of tagTypes" [value]="type">
                                    {{ type }}
                                </mat-option>
                            </mat-select>
                        </mat-form-field>
                    </td>
                </ng-container>

                <!-- Address Column -->
                <ng-container matColumnDef="address">
                    <th mat-header-cell *matHeaderCellDef>Address</th>
                    <td mat-cell *matCellDef="let element">{{ element.address }}</td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;"
                    (click)="onRowClicked(row)"
                    [class.selected]="selection.isSelected(row)">
                </tr>
            </table>
        </div>
    </div>

    <!-- Actions -->
    <div class="actions">
        <button mat-raised-button color="primary" (click)="onApply()" [disabled]="selection.selected.length === 0">
            Add Selected Tags ({{ selection.selected.length }})
        </button>
        <button mat-button (click)="onCancel()">Cancel</button>
    </div>
</div>
```

**Archivo**: `/client/src/app/device/tag-property/tag-property-edit-thingsboard/tag-property-edit-thingsboard.component.scss`

```scss
.thingsboard-tag-editor {
    padding: 20px;
    max-width: 1200px;

    h3 {
        margin-bottom: 20px;
        color: #333;
    }

    h4 {
        margin: 15px 0 10px 0;
        color: #555;
        font-size: 16px;
    }

    .loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 40px;
        gap: 15px;

        span {
            color: #666;
        }
    }

    .error-message {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 15px;
        background-color: #ffebee;
        border-left: 4px solid #f44336;
        border-radius: 4px;
        margin-bottom: 20px;

        mat-icon {
            color: #f44336;
        }

        span {
            flex: 1;
            color: #c62828;
        }
    }

    .browser-content {
        .device-selection {
            margin-bottom: 30px;

            .full-width {
                width: 100%;
            }
        }

        .telemetry-table {
            margin-bottom: 20px;

            table {
                width: 100%;

                .type-select {
                    width: 120px;
                    margin: 0;
                    
                    ::ng-deep .mat-form-field-wrapper {
                        padding-bottom: 0;
                    }
                }

                tr.selected {
                    background-color: #e3f2fd;
                }

                tr:hover {
                    background-color: #f5f5f5;
                    cursor: pointer;
                }
            }
        }
    }

    .actions {
        display: flex;
        gap: 10px;
        margin-top: 20px;
        padding-top: 20px;
        border-top: 1px solid #e0e0e0;
    }
}
```

---

## Testing

### 1. Testing Backend

Crear archivo de test: `/server/test/thingsboard-driver.test.js`

```javascript
const assert = require('chai').assert;
const ThingsBoardClient = require('../runtime/devices/thingsboard');

describe('ThingsBoard Driver', function() {
    this.timeout(10000);

    let driver;
    const mockLogger = {
        info: (msg) => console.log('[INFO]', msg),
        error: (msg) => console.error('[ERROR]', msg),
        warn: (msg) => console.warn('[WARN]', msg)
    };

    const mockEvents = {
        emit: (event, data) => console.log('[EVENT]', event, data)
    };

    const mockRuntime = {
        logger: mockLogger,
        events: mockEvents
    };

    const testConfig = {
        id: 'test_device',
        name: 'Test ThingsBoard',
        type: 'ThingsBoard',
        enabled: true,
        property: {
            serverUrl: 'http://demo.thingsboard.io',
            username: 'tenant@thingsboard.org',
            password: 'tenant',
            useMqtt: false
        },
        tags: {}
    };

    beforeEach(function() {
        driver = ThingsBoardClient.create(testConfig, mockLogger, mockEvents, null, mockRuntime);
    });

    it('should create driver instance', function() {
        assert.isNotNull(driver);
        assert.isFunction(driver.connect);
        assert.isFunction(driver.disconnect);
    });

    it('should connect to ThingsBoard', async function() {
        await driver.connect();
        assert.isTrue(driver.isConnected());
    });

    it('should browse devices', async function() {
        await driver.connect();
        const devices = await driver.browse('');
        assert.isArray(devices);
        assert.isTrue(devices.length > 0);
    });

    afterEach(async function() {
        if (driver && driver.isConnected()) {
            await driver.disconnect();
        }
    });
});
```

### 2. Testing Manual

#### Test 1: Crear Dispositivo

1. Abrir FUXA
2. Ir a Devices
3. Agregar nuevo dispositivo
4. Seleccionar tipo "ThingsBoard"
5. Configurar:
   - Server URL: `http://demo.thingsboard.io`
   - Username: `tenant@thingsboard.org`
   - Password: `tenant`
   - Use MQTT: ✓
6. Guardar

#### Test 2: Auto-descubrimiento

1. Abrir dispositivo ThingsBoard
2. Click en "Browse"
3. Verificar que aparecen dispositivos
4. Seleccionar un dispositivo
5. Verificar que aparecen claves de telemetría
6. Seleccionar algunas claves
7. Agregar como tags

#### Test 3: Lectura de Valores

1. Con tags configurados
2. Verificar que los valores se actualizan
3. Verificar timestamp
4. Verificar formato de valores

#### Test 4: Escritura de Valores

1. Configurar un tag con writeType: "attribute"
2. Escribir un valor desde FUXA
3. Verificar en ThingsBoard que se actualizó

---

## Checklist de Implementación

### Backend
- [ ] Modificar `/server/runtime/devices/device.js`
  - [ ] Agregar import de ThingsBoardClient
  - [ ] Agregar case en constructor
  - [ ] Agregar soporte browse
  - [ ] Agregar a DeviceEnum
  - [ ] Agregar a loadPlugin
- [ ] Verificar que axios está en package.json
- [ ] Verificar que mqtt está en package.json
- [ ] Reiniciar servidor
- [ ] Verificar logs sin errores

### Frontend
- [ ] Modificar `/client/src/app/_models/device.ts`
  - [ ] Agregar ThingsBoard a DeviceType enum
  - [ ] Actualizar descriptor
- [ ] Crear componente de propiedades
  - [ ] Crear archivos .ts, .html, .scss
  - [ ] Implementar formulario
  - [ ] Implementar validación
- [ ] Verificar componente de tags existente
  - [ ] Actualizar HTML si es necesario
  - [ ] Actualizar estilos
- [ ] Registrar componentes en módulo
  - [ ] Agregar a declarations
  - [ ] Agregar a imports si es necesario
- [ ] Actualizar UI de dispositivos
  - [ ] Agregar icono
  - [ ] Agregar a lista de tipos
- [ ] Compilar frontend
- [ ] Verificar sin errores de compilación

### Testing
- [ ] Test de conexión
- [ ] Test de auto-descubrimiento
- [ ] Test de lectura de valores
- [ ] Test de escritura de valores
- [ ] Test de MQTT
- [ ] Test de DAQ
- [ ] Test de múltiples dispositivos

### Documentación
- [ ] Actualizar README
- [ ] Crear guía de usuario
- [ ] Agregar ejemplos
- [ ] Agregar screenshots
- [ ] Documentar troubleshooting

---

## Comandos Útiles

### Desarrollo

```bash
# Backend
cd server
npm install
npm start

# Frontend
cd client
npm install
npm start

# Build completo
npm run build
```

### Testing

```bash
# Backend tests
cd server
npm test

# Frontend tests
cd client
npm test
```

### Logs

```bash
# Ver logs del servidor
tail -f server/logs/fuxa.log

# Ver logs en tiempo real
npm start | grep ThingsBoard
```

---

## Recursos Adicionales

- [ThingsBoard Demo](http://demo.thingsboard.io)
- [ThingsBoard Documentation](https://thingsboard.io/docs/)
- [FUXA GitHub](https://github.com/frangoteam/FUXA)
- [Angular Material](https://material.angular.io/)

---

**Última actualización**: 2025-10-07
