/**
 * ThingsBoard Device Mapper
 * Maps ThingsBoard devices and telemetry to FUXA tags
 */

'use strict';

class TBDeviceMapper {
    constructor(logger) {
        this.logger = logger;
        this.deviceCache = new Map(); // deviceId -> device info
        this.tagCache = new Map();    // tagId -> tag info
    }

    /**
     * Map ThingsBoard device to FUXA format
     */
    mapDevice(tbDevice) {
        const mapped = {
            id: tbDevice.id.id,
            name: tbDevice.name,
            type: tbDevice.type,
            label: tbDevice.label || '',
            createdTime: tbDevice.createdTime
        };

        this.deviceCache.set(mapped.id, mapped);
        return mapped;
    }

    /**
     * Map ThingsBoard telemetry key to FUXA tag
     */
    mapTelemetryToTag(deviceId, key, options = {}) {
        const tagId = this._generateTagId(deviceId, key);
        
        const tag = {
            id: tagId,
            name: options.name || key,
            address: `${deviceId}:${key}`,
            type: options.type || this._inferType(key),
            memaddress: '',
            divisor: options.divisor || 1,
            format: options.format || 2,
            daq: {
                enabled: options.daqEnabled || false,
                interval: options.daqInterval || 60,
                changed: options.daqChanged || true
            }
        };

        this.tagCache.set(tagId, tag);
        return tag;
    }

    /**
     * Generate unique tag ID
     */
    _generateTagId(deviceId, key) {
        return `tb_${deviceId}_${key}`.replace(/[^a-zA-Z0-9_]/g, '_');
    }

    /**
     * Infer FUXA tag type from telemetry key name
     */
    _inferType(key) {
        const lowerKey = key.toLowerCase();
        
        // Boolean indicators
        if (lowerKey.includes('active') || 
            lowerKey.includes('enabled') || 
            lowerKey.includes('status') ||
            lowerKey === 'on' || 
            lowerKey === 'off') {
            return 'Bool';
        }
        
        // Integer indicators
        if (lowerKey.includes('count') || 
            lowerKey.includes('index') ||
            lowerKey.includes('id')) {
            return 'DInt';
        }
        
        // Default to Real (float)
        return 'Real';
    }

    /**
     * Parse tag address to get device ID and key
     */
    parseTagAddress(address) {
        const parts = address.split(':');
        if (parts.length !== 2) {
            throw new Error(`Invalid tag address format: ${address}`);
        }
        
        return {
            deviceId: parts[0],
            key: parts[1]
        };
    }

    /**
     * Get cached device info
     */
    getDevice(deviceId) {
        return this.deviceCache.get(deviceId);
    }

    /**
     * Get cached tag info
     */
    getTag(tagId) {
        return this.tagCache.get(tagId);
    }

    /**
     * Clear caches
     */
    clearCache() {
        this.deviceCache.clear();
        this.tagCache.clear();
    }

    /**
     * Map multiple devices
     */
    mapDevices(tbDevices) {
        return tbDevices.map(device => this.mapDevice(device));
    }

    /**
     * Create tag structure for browse result
     */
    createBrowseNode(deviceId, key, isDevice = false) {
        if (isDevice) {
            return {
                id: deviceId,
                name: key,
                class: 'device',
                children: true
            };
        } else {
            return {
                id: this._generateTagId(deviceId, key),
                name: key,
                address: `${deviceId}:${key}`,
                type: this._inferType(key),
                class: 'tag'
            };
        }
    }
}

module.exports = TBDeviceMapper;
