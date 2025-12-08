import { AfterViewInit, Component, OnInit, ViewChild, Inject, OnDestroy } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { MatLegacyPaginator as MatPaginator } from '@angular/material/legacy-paginator';
import { MatSort } from '@angular/material/sort';
import { MatLegacyTable as MatTable, MatLegacyTableDataSource as MatTableDataSource } from '@angular/material/legacy-table';
import { Device, DeviceType, TAG_PREFIX, Tag } from '../../_models/device';
import { ProjectService } from '../../_services/project.service';
import { Subject, takeUntil, debounceTime } from 'rxjs';
import { Utils } from '../../_helpers/utils';
import { TagPropertyService } from '../tag-property/tag-property.service';
import { HttpClient } from '@angular/common/http';

@Component({
    selector: 'app-device-tag-selection',
    templateUrl: './device-tag-selection.component.html',
    styleUrls: ['./device-tag-selection.component.scss']
})
export class DeviceTagSelectionComponent implements OnInit, AfterViewInit, OnDestroy {

    @ViewChild(MatTable, { static: false }) table: MatTable<any>;
    @ViewChild(MatSort, { static: false }) sort: MatSort;
    @ViewChild(MatPaginator, { static: false }) paginator: MatPaginator;

    private destroy$ = new Subject<void>();

    dataSource = new MatTableDataSource([]);
    nameFilter = new UntypedFormControl();
    addressFilter = new UntypedFormControl();
    deviceFilter = new UntypedFormControl();
    tbDeviceSearchFilter = new UntypedFormControl();
    tags: TagElement[] = [];
    devices: Device[] = [];
    filteredValues = {
        name: '', address: '', device: ''
    };
    
    // ThingsBoard pagination state
    tbCurrentPage = 0;
    tbPageSize = 50;
    tbTotalPages = 0;
    tbHasNext = false;
    tbSearchText = '';
    tbLoadedDevices = new Map<string, any>();
    isLoadingTbDevices = false;

    readonly defColumns = ['toogle', 'name', 'address', 'device', 'select'];
    deviceTagNotEditable = [DeviceType.MQTTclient, DeviceType.ODBC];

    constructor(public dialogRef: MatDialogRef<DeviceTagSelectionComponent>,
        private projectService: ProjectService,
        private tagPropertyService: TagPropertyService,
        private http: HttpClient,
        @Inject(MAT_DIALOG_DATA) public data: DeviceTagSelectionData) {
        this.loadDevicesTags();
    }

    ngOnInit() {
        this.nameFilter.valueChanges.pipe(
            takeUntil(this.destroy$)
        ).subscribe((nameFilterValue) => {
            this.filteredValues['name'] = nameFilterValue;
            this.dataSource.filter = JSON.stringify(this.filteredValues);
        });

        this.addressFilter.valueChanges.pipe(
            takeUntil(this.destroy$)
        ).subscribe((addressFilterValue) => {
            this.filteredValues['address'] = addressFilterValue;
            this.dataSource.filter = JSON.stringify(this.filteredValues);
        });

        this.deviceFilter.valueChanges.pipe(
            takeUntil(this.destroy$)
        ).subscribe((deviceFilterValue) => {
            this.filteredValues['device'] = deviceFilterValue;
            this.dataSource.filter = JSON.stringify(this.filteredValues);
        });
        
        // ThingsBoard device search with debounce
        this.tbDeviceSearchFilter.valueChanges.pipe(
            takeUntil(this.destroy$),
            debounceTime(500)
        ).subscribe((searchValue) => {
            this.tbSearchText = searchValue || '';
            this.tbCurrentPage = 0;
            this.tbLoadedDevices.clear();
            // Remove existing GDT tags before searching
            this.tags = this.tags.filter(tag => !tag.device.startsWith('GDT:'));
            this.dataSource.data = this.tags;
            this.loadThingsBoardDevices();
        });
        
        this.dataSource.filterPredicate = this.customFilterPredicate();
    }

    ngOnDestroy() {
        this.destroy$.next(null);
        this.destroy$.complete();
    }

    customFilterPredicate() {
        const myFilterPredicate = (data: TagElement, filter: string): boolean => {
            let searchString = JSON.parse(filter);
            return (data.name.toString().trim().toLowerCase().indexOf(searchString.name.toLowerCase()) !== -1)
                && ((searchString.address && data.address && data.address?.toString().trim().toLowerCase().indexOf(searchString.address.toLowerCase()) !== -1)
                    || !searchString.address)
                && (data.device.toString().trim().toLowerCase().indexOf(searchString.device.toLowerCase()) !== -1);
        };
        return myFilterPredicate;
    }

    ngAfterViewInit() {
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
    }

    onToogle(element: TagElement) {
        if (element.checked && !this.data.multiSelection) {
            this.dataSource.data.forEach(e => {
                if (e.id !== element.id) {
                    e.checked = false;
                }
            });
        }
    }

    onClearSelection() {
        this.dataSource.data.forEach(e => {
            e.checked = false;
        });
    }

    onNoClick(): void {
        this.dialogRef.close();
    }

    onOkClick(): void {
        this.data.variableId = null;
        this.data.variablesId = [];
        this.dataSource.data.forEach(e => {
            if (e.checked) {
                this.data.variableId = e.id;
                this.data.variablesId.push(e.id);
            }
        });
        this.dialogRef.close(this.data);
    }

    onSelect(element: TagElement, deviceName?: string) {
        this.data.deviceName = deviceName;
        this.data.variableId = element.id;
        this.dialogRef.close(this.data);
    }

    onAddDeviceTag(device: Device) {
        let newTag = new Tag(Utils.getGUID(TAG_PREFIX));
        if (device.type === DeviceType.OPCUA) {
            this.tagPropertyService.addTagsOpcUa(device).subscribe(result => {
                this.loadDevicesTags();
            });
        } else if (device.type === DeviceType.BACnet) {
            this.tagPropertyService.editTagPropertyBacnet(device).subscribe(result => {
                this.loadDevicesTags();
            });
        } else if (device.type === DeviceType.WebAPI) {
            this.tagPropertyService.editTagPropertyWebapi(device).subscribe(result => {
                this.loadDevicesTags();
            });
        } else if (device.type === DeviceType.SiemensS7) {
            this.tagPropertyService.editTagPropertyS7(device, newTag, true).subscribe(result => {
                this.loadDevicesTags(newTag, device.name);
            });
        } else if (device.type === DeviceType.FuxaServer) {
            this.tagPropertyService.editTagPropertyServer(device, newTag, true).subscribe(result => {
                this.loadDevicesTags(newTag, device.name);
            });
        } else if (device.type === DeviceType.ModbusRTU || device.type === DeviceType.ModbusTCP) {
            this.tagPropertyService.editTagPropertyModbus(device, newTag, true).subscribe(result => {
                this.loadDevicesTags(newTag, device.name);
            });
        } else if (device.type === DeviceType.internal) {
            this.tagPropertyService.editTagPropertyInternal(device, newTag, true).subscribe(result => {
                this.loadDevicesTags(newTag, device.name);
            });
        } else if (device.type === DeviceType.EthernetIP) {
            this.tagPropertyService.editTagPropertyEthernetIp(device, newTag, true).subscribe(result => {
                this.loadDevicesTags(newTag, device.name);
            });
        } else if (device.type === DeviceType.ADSclient) {
            this.tagPropertyService.editTagPropertyADSclient(device, newTag, true).subscribe(result => {
                this.loadDevicesTags(newTag, device.name);
            });
        } else if (device.type === DeviceType.GPIO) {
            this.tagPropertyService.editTagPropertyGpio(device, newTag, true).subscribe(result => {
                this.loadDevicesTags(newTag, device.name);
            });
        } else if (device.type === DeviceType.WebCam) {
            this.tagPropertyService.editTagPropertyWebcam(device, newTag, true).subscribe(result => {
                this.loadDevicesTags(newTag, device.name);
            });
        } else if (device.type === DeviceType.MELSEC) {
            this.tagPropertyService.editTagPropertyMelsec(device, newTag, true).subscribe(result => {
                this.loadDevicesTags(newTag, device.name);
            });
        }
    }

    isDeviceTagEditable(type: DeviceType) {
        return !this.deviceTagNotEditable.includes(type);
    }

    private async loadDevicesTags(newTag?: Tag, deviceName?: string) {
        this.tags = [];
        this.devices = Object.values(this.projectService.getDevices());
        
        // Load tags from project devices (Modbus, OPC UA, etc.)
        if (this.devices) {
            this.devices.forEach((device: Device) => {
                if (this.data.deviceFilter && this.data.deviceFilter.indexOf(device.type) !== -1) {
                    // filtered device
                } else if (device.tags) {
                    if (this.data.isHistorical) {
                        Object.values(device.tags).filter((t: Tag) => t.daq?.enabled).forEach((t: Tag) => {
                            this.tags.push(<TagElement> {
                                id: t.id,
                                name: t.name,
                                address: t.address,
                                device: device.name,
                                checked: (t.id === this.data.variableId),
                                error: null
                            });
                        });
                    } else {
                        Object.values(device.tags).forEach((t: Tag) => {
                            this.tags.push(<TagElement> {
                                id: t.id,
                                name: t.name,
                                address: t.address,
                                device: device.name,
                                checked: (t.id === this.data.variableId),
                                error: null
                            });
                        });
                    }
                }
            });
        }
        
        // Load first page of ThingsBoard devices with pagination
        await this.loadThingsBoardDevices();
        
        console.log('Total tags loaded:', this.tags.length);
        
        this.dataSource.data = this.tags;
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;

        if (newTag && deviceName) {
            this.onSelect(<TagElement>{ id: newTag.id }, deviceName);
        }
    }
    
    /**
     * Load ThingsBoard devices with pagination and search
     */
    private async loadThingsBoardDevices() {
        if (this.isLoadingTbDevices) {
            return;
        }
        
        try {
            this.isLoadingTbDevices = true;
            
            const response: any = await this.http.get('/api/thingsboard/devices', {
                params: {
                    pageSize: this.tbPageSize.toString(),
                    page: this.tbCurrentPage.toString(),
                    searchText: this.tbSearchText
                }
            }).toPromise();
            
            console.log('ThingsBoard devices page loaded:', response);
            console.log('Response data:', response?.data);
            console.log('Response data length:', response?.data?.length);
            
            // Update pagination info even if no data
            this.tbTotalPages = response?.totalPages || 0;
            this.tbHasNext = response?.hasNext || false;
            
            if (response && response.data && response.data.length > 0) {
                console.log(`TB Pagination: page ${this.tbCurrentPage + 1}/${this.tbTotalPages}, hasNext: ${this.tbHasNext}`);
                
                // Filter only new devices
                const newDevices = response.data.filter(tbDevice => {
                    const deviceId = tbDevice.id?.id || tbDevice.id;
                    return !this.tbLoadedDevices.has(deviceId);
                });
                
                console.log(`Loading telemetry keys for ${newDevices.length} new devices in parallel...`);
                
                // Load telemetry keys for all new devices in parallel
                const devicePromises = newDevices.map((tbDevice) => {
                    const deviceId = tbDevice.id?.id || tbDevice.id;
                    const deviceName = tbDevice.name;
                    
                    this.tbLoadedDevices.set(deviceId, tbDevice);
                    
                    return this.http.get<string[]>(`/api/thingsboard/device/${deviceId}/keys`).toPromise()
                        .then((keys: string[]) => {
                            if (keys && keys.length > 0) {
                                // Filter keys by search text if provided
                                let filteredKeys = keys;
                                if (this.tbSearchText && this.tbSearchText.trim() !== '') {
                                    const searchLower = this.tbSearchText.toLowerCase();
                                    filteredKeys = keys.filter(key => 
                                        key.toLowerCase().includes(searchLower) || 
                                        deviceName.toLowerCase().includes(searchLower)
                                    );
                                }
                                
                                // Create tags for filtered keys
                                return filteredKeys.map((key: string) => ({
                                    id: `tb:${deviceId}:${key}`,
                                    name: key,
                                    address: deviceId,
                                    device: `GDT:${deviceName}`,
                                    checked: (`tb:${deviceId}:${key}` === this.data.variableId),
                                    error: null
                                }));
                            }
                            return [];
                        })
                        .catch((err) => {
                            console.error(`Failed to load telemetry keys for device ${deviceName}:`, err);
                            return [];
                        });
                });
                
                // Wait for all devices to load in parallel
                const deviceTagsArrays = await Promise.all(devicePromises);
                
                // Flatten and add all tags
                const newTags = [].concat(...deviceTagsArrays);
                this.tags.push(...newTags);
                
                console.log(`Loaded ${newTags.length} new tags from ${newDevices.length} devices`);
                console.log(`Total tags: ${this.tags.length}`);
                
                // Update table data
                this.dataSource.data = this.tags;
            } else {
                console.log('No ThingsBoard devices found in response');
            }
        } catch (err) {
            console.error('Failed to load ThingsBoard devices:', err);
        } finally {
            this.isLoadingTbDevices = false;
        }
    }
    
    /**
     * Load next page of ThingsBoard devices
     */
    async loadMoreThingsBoardDevices() {
        if (!this.tbHasNext || this.isLoadingTbDevices) {
            return;
        }
        
        this.tbCurrentPage++;
        await this.loadThingsBoardDevices();
    }
}

export interface TagElement {
    id: string;
    name: string;
    address: string;
    device: string;
    checked: boolean;
    error: string;
}

export interface DeviceTagSelectionData {
    variableId?: string;
    multiSelection?: boolean;
    deviceFilter?: DeviceType[];
    variablesId?: string[];
    deviceName?: string;
    isHistorical?: boolean;
}
