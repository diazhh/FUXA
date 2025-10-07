/**
 * ThingsBoard Client Driver for FUXA
 * Provides native integration with ThingsBoard IoT Platform
 * 
 * Features:
 * - Auto-discovery of ThingsBoard devices
 * - Real-time telemetry via MQTT
 * - REST API for device management
 * - Attribute writing and RPC commands
 */

'use strict';

const TBRestClient = require('./tb-rest-client');
const TBMqttClient = require('./tb-mqtt-client');
const TBDeviceMapper = require('./tb-device-mapper');
const utils = require('../../utils');
const deviceUtils = require('../device-utils');

function ThingsBoardClient(_data, _logger, _events, _runtime) {
    var runtime = _runtime;
    var data = _data;                       // Current Device data { id, name, tags, enabled, ... }
    var logger = _logger;                   // Logger
    var working = false;                    // Working flag to manage overloading polling and connection
    var connected = false;                  // Connected flag
    var events = _events;                   // Events to commit change to runtime
    var lastStatus = '';                    // Last Device status
    var varsValue = {};                     // Tags values { id: { value, timestamp } }
    var lastTimestampValue;                 // Last Timestamp of asked values
    var overloading = 0;                    // Overloading counter

    // ThingsBoard clients
    var restClient = null;                  // REST API client
    var mqttClient = null;                  // MQTT client (optional)
    var deviceMapper = null;                // Device mapper

    // Configuration
    var serverUrl = '';                     // ThingsBoard server URL
    var username = '';                      // Username for authentication
    var password = '';                      // Password for authentication
    var useMqtt = true;                     // Use MQTT for real-time telemetry
    var jwtToken = null;                    // JWT authentication token

    /**
     * Initialize the driver
     */
    this.init = function () {
        // Not used for ThingsBoard
    }

    /**
     * Connect to ThingsBoard server
     * 1. Authenticate via REST API
     * 2. Connect MQTT client (if enabled)
     * 3. Emit connection status
     */
    this.connect = function () {
        return new Promise(async function (resolve, reject) {
            if (_checkWorking(true)) {
                try {
                    logger.info(`'${data.name}' connecting to ThingsBoard ${serverUrl}`, true);

                    // Initialize REST client
                    restClient = new TBRestClient(serverUrl, logger);

                    // Authenticate
                    jwtToken = await restClient.login(username, password);
                    logger.info(`'${data.name}' authenticated successfully`, true);

                    // Initialize device mapper
                    deviceMapper = new TBDeviceMapper(logger);

                    // Connect MQTT if enabled
                    if (useMqtt) {
                        mqttClient = new TBMqttClient(serverUrl, jwtToken, logger);
                        await mqttClient.connect();
                        
                        // Subscribe to telemetry updates
                        mqttClient.on('telemetry', (deviceId, telemetry) => {
                            _handleTelemetryUpdate(deviceId, telemetry);
                        });

                        logger.info(`'${data.name}' MQTT connected`, true);
                    }

                    connected = true;
                    _emitStatus('connect-ok');
                    _checkWorking(false);
                    resolve();

                } catch (err) {
                    logger.error(`'${data.name}' connection error: ${err}`);
                    connected = false;
                    _emitStatus('connect-error');
                    _clearVarsValue();
                    _checkWorking(false);
                    reject(err);
                }
            } else {
                reject('Driver is busy');
            }
        });
    }

    /**
     * Disconnect from ThingsBoard
     */
    this.disconnect = function () {
        return new Promise(async function (resolve, reject) {
            try {
                logger.info(`'${data.name}' disconnecting`, true);

                // Disconnect MQTT
                if (mqttClient) {
                    await mqttClient.disconnect();
                    mqttClient = null;
                }

                // Clear REST client
                restClient = null;
                jwtToken = null;

                connected = false;
                _emitStatus('connect-off');
                _clearVarsValue();
                _checkWorking(false);
                resolve();

            } catch (err) {
                logger.error(`'${data.name}' disconnect error: ${err}`);
                reject(err);
            }
        });
    }

    /**
     * Polling function to read values
     * Used when MQTT is disabled or as fallback
     */
    this.polling = async function () {
        if (!connected || !restClient) {
            return;
        }

        if (_checkWorking(true)) {
            try {
                // Get all device IDs from tags
                const deviceIds = _getDeviceIdsFromTags();

                // Read telemetry for each device
                for (const deviceId of deviceIds) {
                    const keys = _getKeysForDevice(deviceId);
                    if (keys.length > 0) {
                        const telemetry = await restClient.getLatestTelemetry(deviceId, keys);
                        _handleTelemetryUpdate(deviceId, telemetry);
                    }
                }

                lastTimestampValue = new Date().getTime();
                
                // Check for changed values
                var varsValueChanged = await _checkVarsChanged();
                _emitValues(varsValue);

                // Save to DAQ if enabled
                if (this.addDaq && !utils.isEmptyObject(varsValueChanged)) {
                    this.addDaq(varsValueChanged, data.name, data.id);
                }

                _checkWorking(false);

            } catch (err) {
                logger.error(`'${data.name}' polling error: ${err}`);
                _checkWorking(false);
            }
        }
    }

    /**
     * Load device configuration and tags
     */
    this.load = function (_data) {
        data = JSON.parse(JSON.stringify(_data));
        varsValue = {};

        // DEBUG: Log RAW data received
        logger.info(`'${data.name}' ThingsBoard load() called`, true);
        logger.info(`  data.property exists: ${!!data.property}`, true);
        if (data.property) {
            logger.info(`  property keys: ${Object.keys(data.property).join(', ')}`, true);
            logger.info(`  property.serverUrl: '${data.property.serverUrl}'`, true);
            logger.info(`  property.username: '${data.property.username}'`, true);
            logger.info(`  property.address: '${data.property.address}'`, true);
            logger.info(`  Full property: ${JSON.stringify(data.property)}`, true);
        }
        
        // Extract configuration
        if (data.property) {
            serverUrl = data.property.serverUrl || data.property.address || '';
            username = data.property.username || '';
            password = data.property.password || '';
            useMqtt = data.property.useMqtt !== false; // Default true
            
            // TEMPORARY: Use localhost:8080 if empty
            if (!serverUrl) {
                logger.warn(`'${data.name}' serverUrl is empty, using localhost:8080 for testing`, true);
                serverUrl = 'http://localhost:8080';
                username = 'tenant@thingsboard.org';  // Cambia esto por tus credenciales
                password = 'tenant';  // Cambia esto por tu password
            }
            
            // DEBUG: Log final configuration
            logger.info(`'${data.name}' ThingsBoard config loaded:`, true);
            logger.info(`  Final serverUrl: '${serverUrl}'`, true);
            logger.info(`  Final username: '${username}'`, true);
            logger.info(`  Final password: ${password ? '***' : '(empty)'}`, true);
            logger.info(`  Final useMqtt: ${useMqtt}`, true);
        } else {
            logger.error(`'${data.name}' NO property object found!`, true);
        }

        // Initialize tags
        try {
            var count = Object.keys(data.tags || {}).length;
            logger.info(`'${data.name}' loaded ${count} tags`, true);
        } catch (err) {
            logger.error(`'${data.name}' load error: ${err}`);
        }
    }

    /**
     * Get value of a specific tag
     */
    this.getValue = function (id) {
        if (varsValue[id]) {
            return { 
                id: id, 
                value: varsValue[id].value, 
                ts: varsValue[id].timestamp || lastTimestampValue 
            };
        }
        return null;
    }

    /**
     * Get all tag values
     */
    this.getValues = function () {
        return data.tags;
    }

    /**
     * Set value of a tag (write to ThingsBoard)
     */
    this.setValue = async function (tagId, value) {
        if (!connected || !restClient) {
            logger.warn(`'${data.name}' not connected, cannot set value`);
            return false;
        }

        try {
            const tag = data.tags[tagId];
            if (!tag) {
                logger.error(`'${data.name}' tag not found: ${tagId}`);
                return false;
            }

            // Parse address: "deviceId:key"
            const [deviceId, key] = tag.address.split(':');
            if (!deviceId || !key) {
                logger.error(`'${data.name}' invalid tag address: ${tag.address}`);
                return false;
            }

            // Calculate actual value
            const actualValue = await deviceUtils.tagRawCalculator(value, tag, runtime);

            // Write to ThingsBoard
            if (tag.options && tag.options.writeType === 'rpc') {
                // Use RPC command
                await restClient.sendRpcCommand(deviceId, {
                    method: tag.options.rpcMethod || 'setValue',
                    params: { [key]: actualValue }
                });
            } else {
                // Write as shared attribute (default)
                await restClient.writeSharedAttribute(deviceId, key, actualValue);
            }

            logger.info(`'${data.name}' setValue(${tagId}, ${value}) -> ${actualValue}`, true);
            
            // Update local value
            if (!varsValue[tagId]) {
                varsValue[tagId] = {};
            }
            varsValue[tagId].value = actualValue;
            varsValue[tagId].timestamp = new Date().getTime();

            return true;

        } catch (err) {
            logger.error(`'${data.name}' setValue error: ${err}`);
            return false;
        }
    }

    /**
     * Browse ThingsBoard devices and telemetry keys
     * Used for auto-discovery in the UI
     */
    this.browse = function (path, callback) {
        return new Promise(async function (resolve, reject) {
            if (!connected || !restClient) {
                reject('Not connected to ThingsBoard');
                return;
            }

            try {
                if (!path || path === '/' || path === '') {
                    // Root level: list all devices
                    const devices = await restClient.getDevices();
                    const result = devices.map(device => ({
                        id: device.id.id,
                        name: device.name,
                        type: device.type,
                        label: device.label,
                        class: 'device',
                        children: true // Indicate that device has telemetry keys
                    }));
                    resolve(result);

                } else {
                    // Device level: list telemetry keys
                    const deviceId = path;
                    const keys = await restClient.getTelemetryKeys(deviceId);
                    
                    const result = keys.map(key => ({
                        id: `${deviceId}:${key}`,
                        name: key,
                        address: `${deviceId}:${key}`,
                        type: 'Real', // Default type, can be configured
                        class: 'tag'
                    }));
                    resolve(result);
                }

            } catch (err) {
                logger.error(`'${data.name}' browse error: ${err}`);
                reject(err);
            }
        });
    }

    /**
     * Check if connected
     */
    this.isConnected = function () {
        return connected;
    }

    /**
     * Get connection status
     */
    this.getStatus = function () {
        return lastStatus;
    }

    /**
     * Get tag property
     */
    this.getTagProperty = function (tagId) {
        if (data.tags[tagId]) {
            return {
                id: tagId,
                name: data.tags[tagId].name,
                type: data.tags[tagId].type,
                address: data.tags[tagId].address
            };
        }
        return null;
    }

    /**
     * Bind DAQ function
     */
    this.bindAddDaq = function (fnc) {
        this.addDaq = fnc;
    }
    this.addDaq = null;

    /**
     * Get last read timestamp
     */
    this.lastReadTimestamp = () => {
        return lastTimestampValue;
    }

    /**
     * Get DAQ settings for a tag
     */
    this.getTagDaqSettings = (tagId) => {
        return data.tags[tagId] ? data.tags[tagId].daq : null;
    }

    /**
     * Set DAQ settings for a tag
     */
    this.setTagDaqSettings = (tagId, settings) => {
        if (data.tags[tagId]) {
            utils.mergeObjectsValues(data.tags[tagId].daq, settings);
        }
    }

    // ========== PRIVATE FUNCTIONS ==========

    /**
     * Handle telemetry update from MQTT or REST
     */
    var _handleTelemetryUpdate = function (deviceId, telemetry) {
        try {
            // Find all tags for this device
            for (var tagId in data.tags) {
                const tag = data.tags[tagId];
                if (!tag.address) continue;

                const [tagDeviceId, key] = tag.address.split(':');
                if (tagDeviceId === deviceId && telemetry[key] !== undefined) {
                    // Update tag value
                    if (!varsValue[tagId]) {
                        varsValue[tagId] = {};
                    }
                    
                    const newValue = telemetry[key];
                    const oldValue = varsValue[tagId].value;
                    
                    varsValue[tagId].rawValue = newValue;
                    varsValue[tagId].value = newValue;
                    varsValue[tagId].timestamp = telemetry.ts || new Date().getTime();
                    varsValue[tagId].changed = oldValue !== newValue;
                }
            }
        } catch (err) {
            logger.error(`'${data.name}' telemetry update error: ${err}`);
        }
    }

    /**
     * Get unique device IDs from tags
     */
    var _getDeviceIdsFromTags = function () {
        const deviceIds = new Set();
        for (var tagId in data.tags) {
            const tag = data.tags[tagId];
            if (tag.address) {
                const [deviceId] = tag.address.split(':');
                if (deviceId) {
                    deviceIds.add(deviceId);
                }
            }
        }
        return Array.from(deviceIds);
    }

    /**
     * Get telemetry keys for a specific device
     */
    var _getKeysForDevice = function (deviceId) {
        const keys = new Set();
        for (var tagId in data.tags) {
            const tag = data.tags[tagId];
            if (tag.address) {
                const [tagDeviceId, key] = tag.address.split(':');
                if (tagDeviceId === deviceId && key) {
                    keys.add(key);
                }
            }
        }
        return Array.from(keys);
    }

    /**
     * Check for changed values
     */
    var _checkVarsChanged = async function () {
        const timestamp = new Date().getTime();
        var result = {};
        
        for (var id in data.tags) {
            if (varsValue[id] && varsValue[id].changed) {
                // Compose value with scaling if needed
                data.tags[id].value = await deviceUtils.tagValueCompose(
                    varsValue[id].rawValue,
                    varsValue[id].value,
                    data.tags[id],
                    runtime
                );

                // Check if should save to DAQ
                if (this.addDaq && deviceUtils.tagDaqToSave(data.tags[id], timestamp)) {
                    result[id] = data.tags[id];
                }
            }
            
            // Reset changed flag
            if (varsValue[id]) {
                varsValue[id].changed = false;
            }
        }
        
        return result;
    }

    /**
     * Clear all tag values
     */
    var _clearVarsValue = function () {
        for (var id in varsValue) {
            varsValue[id].value = null;
        }
        _emitValues(varsValue);
    }

    /**
     * Emit connection status
     */
    var _emitStatus = function (status) {
        lastStatus = status;
        events.emit('device-status:changed', { id: data.name, status: status });
    }

    /**
     * Emit tag values
     */
    var _emitValues = function (values) {
        events.emit('device-value:changed', { id: data.name, values: values });
    }

    /**
     * Check if driver is working (prevent overloading)
     */
    var _checkWorking = function (check) {
        if (check && working) {
            overloading++;
            logger.warn(`'${data.name}' working overload! ${overloading}`);
            if (overloading >= 3) {
                working = false;
                overloading = 0;
                return true;
            }
            return false;
        }
        working = check;
        overloading = 0;
        return true;
    }
}

module.exports = {
    init: function (settings) {
        // Initialize driver settings if needed
    },
    create: function (data, logger, events, manager, runtime) {
        return new ThingsBoardClient(data, logger, events, runtime);
    }
}
