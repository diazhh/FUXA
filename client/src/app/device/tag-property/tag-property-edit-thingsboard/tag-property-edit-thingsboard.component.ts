/**
 * ThingsBoard Tag Property Editor Component
 * Allows users to browse and select ThingsBoard devices and telemetry
 * 
 * NOTA: Este archivo debe copiarse a:
 * client/src/app/device/tag-property/tag-property-edit-thingsboard/
 * 
 * Las rutas de importación son relativas a esa ubicación.
 */

import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { MatLegacyTableDataSource as MatTableDataSource } from '@angular/material/legacy-table';
import { SelectionModel } from '@angular/cdk/collections';

import { Device, Tag } from '../../../_models/device';
import { HmiService } from '../../../_services/hmi.service';
import { ProjectService } from '../../../_services/project.service';

@Component({
    selector: 'app-tag-property-edit-thingsboard',
    templateUrl: './tag-property-edit-thingsboard.component.html',
    styleUrls: ['./tag-property-edit-thingsboard.component.scss']
})
export class TagPropertyEditThingsboardComponent implements OnInit {

    @Input() device: Device;
    @Input() tag: Tag;
    @Output() result = new EventEmitter<any>();

    // UI State
    loading = false;
    error = '';
    
    // Device browsing
    devices: any[] = [];
    selectedDevice: any = null;
    telemetryKeys: any[] = [];
    
    // Table for telemetry selection
    displayedColumns: string[] = ['select', 'name', 'type', 'address'];
    dataSource = new MatTableDataSource<any>([]);
    selection = new SelectionModel<any>(true, []);

    // Tag configuration
    tagTypes = ['Bool', 'Byte', 'Int', 'Word', 'DInt', 'DWord', 'Real'];
    writeTypes = [
        { value: 'attribute', label: 'Shared Attribute' },
        { value: 'rpc', label: 'RPC Command' }
    ];

    constructor(
        private hmiService: HmiService,
        private projectService: ProjectService
    ) { }

    ngOnInit() {
        if (this.tag && this.tag.address) {
            // Parse existing tag address
            this._parseExistingTag();
        }
        
        // Load devices
        this.loadDevices();
    }

    /**
     * Load ThingsBoard devices
     */
    loadDevices() {
        this.loading = true;
        this.error = '';

        this.hmiService.askDeviceBrowse(this.device.id, '').subscribe({
            next: (result) => {
                if (result && result.length > 0) {
                    this.devices = result;
                } else {
                    this.error = 'No devices found';
                }
                this.loading = false;
            },
            error: (err) => {
                this.error = 'Failed to load devices: ' + (err?.message || err);
                console.error('Error loading devices:', err);
                this.loading = false;
            }
        });
    }

    /**
     * Load telemetry keys for selected device
     */
    onDeviceSelected(device: any) {
        this.selectedDevice = device;
        this.telemetryKeys = [];
        this.loading = true;
        this.error = '';

        this.hmiService.askDeviceBrowse(this.device.id, device.id).subscribe({
            next: (result) => {
                if (result && result.length > 0) {
                    this.telemetryKeys = result;
                    this.dataSource.data = result;
                } else {
                    this.error = 'No telemetry keys found for this device';
                }
                this.loading = false;
            },
            error: (err) => {
                this.error = 'Failed to load telemetry keys: ' + (err?.message || err);
                console.error('Error loading telemetry:', err);
                this.loading = false;
            }
        });
    }

    /**
     * Handle row selection in table
     */
    onRowClicked(row: any) {
        this.selection.toggle(row);
    }

    /**
     * Check if all rows are selected
     */
    isAllSelected() {
        const numSelected = this.selection.selected.length;
        const numRows = this.dataSource.data.length;
        return numSelected === numRows;
    }

    /**
     * Toggle all rows selection
     */
    masterToggle() {
        if (this.isAllSelected()) {
            this.selection.clear();
        } else {
            this.dataSource.data.forEach(row => this.selection.select(row));
        }
    }

    /**
     * Apply selected tags
     */
    onApply() {
        if (this.selection.selected.length === 0) {
            this.error = 'Please select at least one telemetry key';
            return;
        }

        const tags = this.selection.selected.map(item => {
            return {
                id: item.id,
                name: item.name,
                address: item.address,
                type: item.type,
                memaddress: '',
                divisor: 1,
                format: 2,
                options: {
                    writeType: 'attribute'
                }
            };
        });

        this.result.emit({ tags: tags });
    }

    /**
     * Cancel and close
     */
    onCancel() {
        this.result.emit({ cancel: true });
    }

    /**
     * Parse existing tag to pre-select device
     */
    private _parseExistingTag() {
        if (!this.tag.address) return;

        const parts = this.tag.address.split(':');
        if (parts.length === 2) {
            const deviceId = parts[0];
            const key = parts[1];
            
            // Will be selected after devices are loaded
            setTimeout(() => {
                const device = this.devices.find(d => d.id === deviceId);
                if (device) {
                    this.onDeviceSelected(device);
                }
            }, 500);
        }
    }

    /**
     * Refresh devices list
     */
    onRefresh() {
        this.loadDevices();
    }

    /**
     * Get device display name
     */
    getDeviceDisplayName(device: any): string {
        return device.label ? `${device.name} (${device.label})` : device.name;
    }
}
