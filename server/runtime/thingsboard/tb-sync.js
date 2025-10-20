/**
 * ThingsBoard Synchronization Service
 * Manages synchronization of devices and telemetry between ThingsBoard and FUXA
 */

'use strict';

const EventEmitter = require('events');

class ThingsBoardSync extends EventEmitter {
    constructor(client, config, logger) {
        super();
        this.client = client;
        this.config = config;
        this.logger = logger;
        this.devices = new Map();
        this.telemetryCache = new Map();
        this.syncTimer = null;
        this.isRunning = false;
        this.lastSyncTime = null;
        
        this.bindClientEvents();
    }

    /**
     * Bind to client events
     */
    bindClientEvents() {
        this.client.on('connected', () => {
            this.logger.info('thingsboard-sync: client connected, starting sync');
            this.start();
        });

        this.client.on('disconnected', () => {
            this.logger.warn('thingsboard-sync: client disconnected, stopping sync');
            this.stop();
        });

        this.client.on('telemetry-update', (update) => {
            this.handleTelemetryUpdate(update);
        });
    }

    /**
     * Start synchronization service
     */
    async start() {
        if (this.isRunning) {
            this.logger.warn('thingsboard-sync: already running');
            return;
        }

        this.isRunning = true;
        this.logger.info('thingsboard-sync: starting...', true);

        try {
            await this.syncDevices();
            
            if (this.config.useWebSocket) {
                await this.client.connectWebSocket();
                this.subscribeToAllDevices();
            }
            
            this.scheduleSyncTimer();
            
            this.emit('started');
            this.logger.info('thingsboard-sync: started successfully', true);
        } catch (err) {
            this.logger.error(`thingsboard-sync: failed to start! ${err.message}`);
            this.isRunning = false;
            throw err;
        }
    }

    /**
     * Stop synchronization service
     */
    stop() {
        if (!this.isRunning) {
            return;
        }

        this.isRunning = false;
        
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
        }

        this.emit('stopped');
        this.logger.info('thingsboard-sync: stopped', true);
    }

    /**
     * Schedule periodic synchronization
     */
    scheduleSyncTimer() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
        }

        const interval = this.config.syncInterval || 30000;
        
        this.syncTimer = setInterval(async () => {
            try {
                await this.syncDevices();
            } catch (err) {
                this.logger.error(`thingsboard-sync: periodic sync failed! ${err.message}`);
            }
        }, interval);

        this.logger.info(`thingsboard-sync: scheduled periodic sync every ${interval}ms`, true);
    }

    /**
     * Synchronize devices from ThingsBoard
     */
    async syncDevices() {
        try {
            this.logger.info('thingsboard-sync: syncing devices...');
            
            const tbDevices = await this.client.getDevices();
            this.logger.info(`thingsboard-sync: retrieved ${tbDevices ? tbDevices.length : 0} devices from ThingsBoard`);
            
            const filteredDevices = this.filterDevices(tbDevices);
            this.logger.info(`thingsboard-sync: ${filteredDevices.length} devices after filtering`);
            
            const currentDeviceIds = new Set(this.devices.keys());
            const newDeviceIds = new Set();

            for (const tbDevice of filteredDevices) {
                newDeviceIds.add(tbDevice.id.id);
                
                if (!this.devices.has(tbDevice.id.id)) {
                    await this.addDevice(tbDevice);
                } else {
                    await this.updateDevice(tbDevice);
                }
            }

            for (const deviceId of currentDeviceIds) {
                if (!newDeviceIds.has(deviceId)) {
                    this.removeDevice(deviceId);
                }
            }

            this.lastSyncTime = Date.now();
            this.emit('devices-synced', Array.from(this.devices.values()));
            
            this.logger.info(`thingsboard-sync: synced ${this.devices.size} devices`, true);
        } catch (err) {
            this.logger.error(`thingsboard-sync: failed to sync devices! ${err.message}`);
            if (err.stack) {
                this.logger.error(`thingsboard-sync: stack trace: ${err.stack}`);
            }
            // Don't throw, allow sync to continue on next interval
        }
    }

    /**
     * Filter devices based on configuration
     */
    filterDevices(devices) {
        if (!this.config.deviceFilter) {
            return devices;
        }

        return devices.filter(device => {
            if (this.config.deviceFilter.type && device.type !== this.config.deviceFilter.type) {
                return false;
            }

            if (this.config.deviceFilter.label && device.label !== this.config.deviceFilter.label) {
                return false;
            }

            return true;
        });
    }

    /**
     * Add new device
     */
    async addDevice(tbDevice) {
        try {
            const deviceId = tbDevice.id.id;
            this.logger.info(`thingsboard-sync: adding device '${tbDevice.name}' (${deviceId})...`);
            
            this.logger.info(`thingsboard-sync: fetching telemetry keys for '${tbDevice.name}'...`);
            const telemetryKeys = await this.client.getTelemetryKeys(deviceId);
            this.logger.info(`thingsboard-sync: got ${telemetryKeys ? telemetryKeys.length : 0} telemetry keys`);
            
            this.logger.info(`thingsboard-sync: fetching latest telemetry for '${tbDevice.name}'...`);
            const latestTelemetry = await this.client.getLatestTelemetry(deviceId);
            this.logger.info(`thingsboard-sync: got telemetry: ${JSON.stringify(Object.keys(latestTelemetry || {}))}`);
            
            this.logger.info(`thingsboard-sync: mapping device '${tbDevice.name}' to FUXA format...`);
            const fuxaDevice = this.mapThingsBoardDeviceToFuxa(tbDevice, telemetryKeys, latestTelemetry);
            this.logger.info(`thingsboard-sync: mapped device has ${Object.keys(fuxaDevice.tags || {}).length} tags`);
            
            this.devices.set(deviceId, fuxaDevice);
            this.telemetryCache.set(deviceId, latestTelemetry);
            
            this.emit('device-added', fuxaDevice);
            this.logger.info(`thingsboard-sync: added device '${tbDevice.name}'`, true);
        } catch (err) {
            this.logger.error(`thingsboard-sync: failed to add device '${tbDevice.name}'! ${err.message}`);
            if (err.stack) {
                this.logger.error(`thingsboard-sync: stack: ${err.stack}`);
            }
        }
    }

    /**
     * Update existing device
     */
    async updateDevice(tbDevice) {
        try {
            const deviceId = tbDevice.id.id;
            const existingDevice = this.devices.get(deviceId);
            
            if (!existingDevice) {
                return;
            }

            const telemetryKeys = await this.client.getTelemetryKeys(deviceId);
            const latestTelemetry = await this.client.getLatestTelemetry(deviceId);
            
            const fuxaDevice = this.mapThingsBoardDeviceToFuxa(tbDevice, telemetryKeys, latestTelemetry);
            
            this.devices.set(deviceId, fuxaDevice);
            this.telemetryCache.set(deviceId, latestTelemetry);
            
            this.emit('device-updated', fuxaDevice);
        } catch (err) {
            this.logger.error(`thingsboard-sync: failed to update device '${tbDevice.name}'! ${err.message}`);
        }
    }

    /**
     * Remove device
     */
    removeDevice(deviceId) {
        const device = this.devices.get(deviceId);
        
        if (device) {
            this.devices.delete(deviceId);
            this.telemetryCache.delete(deviceId);
            
            this.emit('device-removed', device);
            this.logger.info(`thingsboard-sync: removed device '${device.name}'`, true);
        }
    }

    /**
     * Map ThingsBoard device to FUXA format
     */
    mapThingsBoardDeviceToFuxa(tbDevice, telemetryKeys, latestTelemetry) {
        const deviceId = tbDevice.id.id;
        const tags = {};

        for (const key of telemetryKeys) {
            if (!this.shouldIncludeTelemetryKey(key)) {
                continue;
            }

            const tagId = `tb_${deviceId}_${key}`;
            const telemetryValue = latestTelemetry[key];
            
            tags[tagId] = {
                id: tagId,
                name: key,
                address: key,
                type: this.inferTelemetryType(telemetryValue),
                readonly: false,
                value: telemetryValue ? telemetryValue[0]?.value : null,
                timestamp: telemetryValue ? telemetryValue[0]?.ts : null
            };
        }

        return {
            id: `tb_${deviceId}`,
            name: tbDevice.name,
            type: 'ThingsBoard',
            enabled: true,
            readonly: true,
            source: 'thingsboard',
            polling: this.config.syncInterval || 30000,
            property: {
                deviceId: deviceId,
                deviceType: tbDevice.type,
                label: tbDevice.label || '',
                createdTime: tbDevice.createdTime,
                additionalInfo: tbDevice.additionalInfo
            },
            tags: tags
        };
    }

    /**
     * Check if telemetry key should be included
     */
    shouldIncludeTelemetryKey(key) {
        const telemetryConfig = this.config.telemetryKeys || {};

        if (telemetryConfig.includeAll === false) {
            return telemetryConfig.whitelist && telemetryConfig.whitelist.includes(key);
        }

        if (telemetryConfig.blacklist && telemetryConfig.blacklist.includes(key)) {
            return false;
        }

        return true;
    }

    /**
     * Infer telemetry data type
     */
    inferTelemetryType(telemetryValue) {
        if (!telemetryValue || telemetryValue.length === 0) {
            return 'number';
        }

        const value = telemetryValue[0].value;
        
        if (typeof value === 'boolean') {
            return 'boolean';
        }
        
        if (typeof value === 'string') {
            return 'string';
        }
        
        return 'number';
    }

    /**
     * Subscribe to all devices telemetry via WebSocket
     */
    subscribeToAllDevices() {
        for (const [deviceId, device] of this.devices) {
            const tbDeviceId = device.property.deviceId;
            const keys = Object.values(device.tags).map(tag => tag.name);
            
            this.client.subscribeToTelemetry(tbDeviceId, keys);
        }
        
        this.logger.info(`thingsboard-sync: subscribed to ${this.devices.size} devices`, true);
    }

    /**
     * Handle telemetry update from WebSocket
     */
    handleTelemetryUpdate(update) {
        const { deviceId, data } = update;
        const fuxaDeviceId = `tb_${deviceId}`;
        const device = Array.from(this.devices.values()).find(d => d.property.deviceId === deviceId);
        
        if (!device) {
            return;
        }

        for (const [key, values] of Object.entries(data)) {
            const tagId = `tb_${deviceId}_${key}`;
            
            if (device.tags[tagId]) {
                const latestValue = values[0];
                device.tags[tagId].value = latestValue.value;
                device.tags[tagId].timestamp = latestValue.ts;
                
                this.emit('telemetry-updated', {
                    deviceId: fuxaDeviceId,
                    tagId: tagId,
                    value: latestValue.value,
                    timestamp: latestValue.ts
                });
            }
        }

        const cachedTelemetry = this.telemetryCache.get(deviceId) || {};
        for (const [key, values] of Object.entries(data)) {
            cachedTelemetry[key] = values;
        }
        this.telemetryCache.set(deviceId, cachedTelemetry);
    }

    /**
     * Get all synchronized devices
     */
    getDevices() {
        return Array.from(this.devices.values());
    }

    /**
     * Get device by ID
     */
    getDevice(deviceId) {
        return this.devices.get(deviceId) || this.devices.get(deviceId.replace('tb_', ''));
    }

    /**
     * Get device by name
     */
    getDeviceByName(name) {
        return Array.from(this.devices.values()).find(d => d.name === name);
    }

    /**
     * Get telemetry value for a tag
     */
    getTagValue(deviceId, tagId) {
        const device = this.getDevice(deviceId);
        if (!device || !device.tags[tagId]) {
            return null;
        }
        
        return {
            value: device.tags[tagId].value,
            timestamp: device.tags[tagId].timestamp
        };
    }

    /**
     * Set telemetry value (send to ThingsBoard)
     */
    async setTagValue(deviceId, tagId, value) {
        try {
            const device = this.getDevice(deviceId);
            if (!device) {
                throw new Error(`Device ${deviceId} not found`);
            }

            const tag = device.tags[tagId];
            if (!tag) {
                throw new Error(`Tag ${tagId} not found`);
            }

            const tbDeviceId = device.property.deviceId;
            const telemetry = {
                [tag.name]: value
            };

            await this.client.sendTelemetry(tbDeviceId, telemetry);
            
            tag.value = value;
            tag.timestamp = Date.now();
            
            this.emit('telemetry-sent', {
                deviceId,
                tagId,
                value,
                timestamp: tag.timestamp
            });

            this.logger.info(`thingsboard-sync: sent telemetry ${tag.name}=${value} to device ${device.name}`, true);
            
            return true;
        } catch (err) {
            this.logger.error(`thingsboard-sync: failed to set tag value! ${err.message}`);
            throw err;
        }
    }

    /**
     * Get synchronization status
     */
    getStatus() {
        return {
            running: this.isRunning,
            deviceCount: this.devices.size,
            lastSyncTime: this.lastSyncTime,
            clientStatus: this.client.getStatus()
        };
    }

    /**
     * Force immediate synchronization
     */
    async forceSyncNow() {
        this.logger.info('thingsboard-sync: forcing immediate sync');
        await this.syncDevices();
    }
}

module.exports = ThingsBoardSync;
