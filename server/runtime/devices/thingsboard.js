/**
 * ThingsBoard Device Adapter
 * Implements FUXA Device interface for ThingsBoard devices
 */

'use strict';

function create(data, logger, events, manager, runtime) {
    const tbManager = runtime.thingsboard;
    
    if (!tbManager || !tbManager.isEnabled()) {
        logger.error('thingsboard-device: ThingsBoard manager not available or disabled');
        return null;
    }

    let working = false;
    let connected = false;
    let lastReadTimestamp = 0;
    let varsValue = {};
    let device = JSON.parse(JSON.stringify(data));
    let pollingInterval = data.polling || 30000;

    /**
     * Connect to ThingsBoard (virtual connection)
     */
    const connect = function() {
        return new Promise((resolve, reject) => {
            try {
                if (tbManager.isEnabled()) {
                    connected = true;
                    logger.info(`thingsboard-device: '${data.name}' connected`, true);
                    resolve();
                } else {
                    reject(new Error('ThingsBoard integration is disabled'));
                }
            } catch (err) {
                logger.error(`thingsboard-device: '${data.name}' connection failed! ${err.message}`);
                reject(err);
            }
        });
    };

    /**
     * Disconnect from ThingsBoard (virtual disconnection)
     */
    const disconnect = function() {
        return new Promise((resolve, reject) => {
            connected = false;
            logger.info(`thingsboard-device: '${data.name}' disconnected`, true);
            resolve();
        });
    };

    /**
     * Check if device is connected
     */
    const isConnected = function() {
        return connected && tbManager.isEnabled();
    };

    /**
     * Polling function to read values from ThingsBoard
     */
    const polling = function() {
        if (!connected || working) {
            return;
        }

        working = true;

        try {
            const tbDevice = tbManager.getDevice(data.id);
            
            if (!tbDevice) {
                logger.warn(`thingsboard-device: device '${data.name}' not found in ThingsBoard`);
                working = false;
                return;
            }

            for (const [tagId, tag] of Object.entries(tbDevice.tags)) {
                if (varsValue[tagId]) {
                    const oldValue = varsValue[tagId].value;
                    const newValue = tag.value;
                    
                    varsValue[tagId] = {
                        id: tagId,
                        value: newValue,
                        timestamp: tag.timestamp || Date.now(),
                        changed: oldValue !== newValue
                    };

                    if (varsValue[tagId].changed) {
                        events.emit('device-value:changed', {
                            id: data.id,
                            variableId: tagId,
                            value: newValue
                        });
                    }
                } else {
                    varsValue[tagId] = {
                        id: tagId,
                        value: tag.value,
                        timestamp: tag.timestamp || Date.now(),
                        changed: true
                    };
                }
            }

            lastReadTimestamp = Date.now();
            
        } catch (err) {
            logger.error(`thingsboard-device: polling error for '${data.name}'! ${err.message}`);
        } finally {
            working = false;
        }
    };

    /**
     * Load device configuration
     */
    const load = function(data) {
        try {
            device = JSON.parse(JSON.stringify(data));
            pollingInterval = data.polling || 30000;
            varsValue = {};

            const tbDevice = tbManager.getDevice(data.id);
            if (tbDevice && tbDevice.tags) {
                for (const [tagId, tag] of Object.entries(tbDevice.tags)) {
                    varsValue[tagId] = {
                        id: tagId,
                        value: tag.value,
                        timestamp: tag.timestamp || Date.now(),
                        changed: false
                    };
                }
            }

            logger.info(`thingsboard-device: '${data.name}' loaded with ${Object.keys(varsValue).length} tags`, true);
            return true;
        } catch (err) {
            logger.error(`thingsboard-device: failed to load '${data.name}'! ${err.message}`);
            return false;
        }
    };

    /**
     * Get device status
     */
    const getStatus = function() {
        return {
            id: device.id,
            name: device.name,
            type: device.type,
            connected: connected,
            status: connected ? 'connect-ok' : 'connect-off'
        };
    };

    /**
     * Get all tag values
     */
    const getValues = function() {
        return varsValue;
    };

    /**
     * Get single tag value with timestamp
     */
    const getValue = function(id) {
        if (varsValue[id]) {
            return {
                id: id,
                value: varsValue[id].value,
                ts: varsValue[id].timestamp,
                daq: false
            };
        }
        return null;
    };

    /**
     * Set tag value (write to ThingsBoard)
     */
    const setValue = async function(id, value) {
        try {
            if (!connected) {
                throw new Error('Device not connected');
            }

            await tbManager.setTagValue(device.id, id, value);

            if (varsValue[id]) {
                varsValue[id].value = value;
                varsValue[id].timestamp = Date.now();
                varsValue[id].changed = true;
            }

            events.emit('device-value:changed', {
                id: device.id,
                variableId: id,
                value: value
            });

            logger.info(`thingsboard-device: set value ${id}=${value} for '${data.name}'`, true);
            return true;
        } catch (err) {
            logger.error(`thingsboard-device: failed to set value for '${data.name}'! ${err.message}`);
            throw err;
        }
    };

    /**
     * Get tag property
     */
    const getTagProperty = function(id) {
        const tbDevice = tbManager.getDevice(device.id);
        if (tbDevice && tbDevice.tags && tbDevice.tags[id]) {
            return tbDevice.tags[id];
        }
        return null;
    };

    /**
     * Get all tags properties
     */
    const getTagsProperty = function() {
        return new Promise((resolve, reject) => {
            try {
                const tbDevice = tbManager.getDevice(device.id);
                if (tbDevice && tbDevice.tags) {
                    resolve(tbDevice.tags);
                } else {
                    resolve({});
                }
            } catch (err) {
                reject(err);
            }
        });
    };

    /**
     * Bind function to add DAQ values
     */
    const bindAddDaq = function(fnc) {
        // ThingsBoard handles its own data storage
        // This is a no-op for compatibility
    };

    /**
     * Get last read timestamp
     */
    const lastReadTimestampFnc = function() {
        return lastReadTimestamp;
    };

    /**
     * Get tag DAQ settings
     */
    const getTagDaqSettings = function(tagId) {
        const tag = getTagProperty(tagId);
        if (tag && tag.daq) {
            return tag.daq;
        }
        return null;
    };

    /**
     * Set tag DAQ settings
     */
    const setTagDaqSettings = function(tagId, settings) {
        // ThingsBoard manages its own data
        // This is a no-op for compatibility
        return true;
    };

    /**
     * Browse device (list available telemetry)
     */
    const browse = function(node, callback) {
        return new Promise((resolve, reject) => {
            try {
                const tbDevice = tbManager.getDevice(device.id);
                if (!tbDevice) {
                    reject(new Error('Device not found'));
                    return;
                }

                const result = [];
                for (const [tagId, tag] of Object.entries(tbDevice.tags)) {
                    result.push({
                        id: tagId,
                        name: tag.name,
                        type: tag.type,
                        address: tag.address,
                        value: tag.value
                    });
                }

                resolve(result);
            } catch (err) {
                reject(err);
            }
        });
    };

    /**
     * Initialize device
     */
    load(data);

    // Subscribe to ThingsBoard events
    if (tbManager) {
        tbManager.on('telemetry-updated', (update) => {
            if (update.deviceId === device.id) {
                if (varsValue[update.tagId]) {
                    const oldValue = varsValue[update.tagId].value;
                    varsValue[update.tagId].value = update.value;
                    varsValue[update.tagId].timestamp = update.timestamp;
                    varsValue[update.tagId].changed = oldValue !== update.value;

                    if (varsValue[update.tagId].changed) {
                        events.emit('device-value:changed', {
                            id: device.id,
                            variableId: update.tagId,
                            value: update.value
                        });
                    }
                }
            }
        });

        tbManager.on('device-updated', (updatedDevice) => {
            if (updatedDevice.id === device.id) {
                load(updatedDevice);
            }
        });
    }

    return {
        connect: connect,
        disconnect: disconnect,
        isConnected: isConnected,
        polling: polling,
        load: load,
        getStatus: getStatus,
        getValues: getValues,
        getValue: getValue,
        setValue: setValue,
        getTagProperty: getTagProperty,
        getTagsProperty: getTagsProperty,
        bindAddDaq: bindAddDaq,
        lastReadTimestamp: lastReadTimestampFnc,
        getTagDaqSettings: getTagDaqSettings,
        setTagDaqSettings: setTagDaqSettings,
        browse: browse
    };
}

module.exports = {
    create: create
};
