/**
 * ThingsBoard MQTT Client
 * Handles MQTT communication for real-time telemetry
 */

'use strict';

const mqtt = require('mqtt');
const EventEmitter = require('events');

class TBMqttClient extends EventEmitter {
    constructor(serverUrl, token, logger) {
        super();
        
        this.serverUrl = serverUrl;
        this.token = token;
        this.logger = logger;
        this.client = null;
        this.connected = false;
        this.subscribedDevices = new Set();
        
        // Extract MQTT broker URL from server URL
        this.mqttUrl = this._getMqttUrl(serverUrl);
    }

    /**
     * Extract MQTT broker URL from HTTP server URL
     */
    _getMqttUrl(serverUrl) {
        const url = new URL(serverUrl);
        const protocol = url.protocol === 'https:' ? 'mqtts:' : 'mqtt:';
        const port = url.protocol === 'https:' ? 8883 : 1883;
        return `${protocol}//${url.hostname}:${port}`;
    }

    /**
     * Connect to ThingsBoard MQTT broker
     */
    async connect() {
        return new Promise((resolve, reject) => {
            try {
                const options = {
                    clientId: `fuxa_${Date.now()}`,
                    username: this.token,
                    password: '',
                    keepalive: 60,
                    reconnectPeriod: 5000,
                    connectTimeout: 30000
                };

                this.client = mqtt.connect(this.mqttUrl, options);

                this.client.on('connect', () => {
                    this.logger.info('MQTT connected to ThingsBoard');
                    this.connected = true;
                    this.emit('connected');
                    resolve();
                });

                this.client.on('error', (error) => {
                    this.logger.error('MQTT error:', error.message);
                    this.emit('error', error);
                    if (!this.connected) {
                        reject(error);
                    }
                });

                this.client.on('close', () => {
                    this.logger.warn('MQTT connection closed');
                    this.connected = false;
                    this.emit('disconnected');
                });

                this.client.on('reconnect', () => {
                    this.logger.info('MQTT reconnecting...');
                });

                this.client.on('message', (topic, message) => {
                    this._handleMessage(topic, message);
                });

            } catch (error) {
                this.logger.error('MQTT connect error:', error);
                reject(error);
            }
        });
    }

    /**
     * Disconnect from MQTT broker
     */
    async disconnect() {
        return new Promise((resolve) => {
            if (this.client) {
                this.client.end(true, () => {
                    this.connected = false;
                    this.logger.info('MQTT disconnected');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    /**
     * Subscribe to device telemetry
     */
    subscribeToDevice(deviceId) {
        if (!this.connected || !this.client) {
            this.logger.warn('Cannot subscribe: MQTT not connected');
            return;
        }

        // Gateway telemetry topic
        const topic = 'v1/gateway/telemetry';
        
        if (!this.subscribedDevices.has(deviceId)) {
            this.client.subscribe(topic, (err) => {
                if (err) {
                    this.logger.error(`Failed to subscribe to ${topic}:`, err);
                } else {
                    this.subscribedDevices.add(deviceId);
                    this.logger.info(`Subscribed to telemetry for device ${deviceId}`);
                }
            });
        }
    }

    /**
     * Unsubscribe from device telemetry
     */
    unsubscribeFromDevice(deviceId) {
        if (!this.connected || !this.client) {
            return;
        }

        this.subscribedDevices.delete(deviceId);
        
        // If no more devices subscribed, unsubscribe from topic
        if (this.subscribedDevices.size === 0) {
            const topic = 'v1/gateway/telemetry';
            this.client.unsubscribe(topic);
        }
    }

    /**
     * Handle incoming MQTT message
     */
    _handleMessage(topic, message) {
        try {
            const payload = JSON.parse(message.toString());
            
            if (topic === 'v1/gateway/telemetry') {
                // Gateway telemetry format: { "deviceName": [{ ts, values }] }
                for (const deviceName in payload) {
                    const telemetryArray = payload[deviceName];
                    if (Array.isArray(telemetryArray)) {
                        telemetryArray.forEach(item => {
                            this.emit('telemetry', deviceName, item.values);
                        });
                    }
                }
            }
        } catch (error) {
            this.logger.error('Error parsing MQTT message:', error);
        }
    }

    /**
     * Publish telemetry (if needed for gateway mode)
     */
    publishTelemetry(deviceName, telemetry) {
        if (!this.connected || !this.client) {
            this.logger.warn('Cannot publish: MQTT not connected');
            return false;
        }

        const topic = 'v1/gateway/telemetry';
        const payload = {
            [deviceName]: [{
                ts: Date.now(),
                values: telemetry
            }]
        };

        this.client.publish(topic, JSON.stringify(payload), (err) => {
            if (err) {
                this.logger.error('Failed to publish telemetry:', err);
            }
        });

        return true;
    }

    /**
     * Check if connected
     */
    isConnected() {
        return this.connected;
    }
}

module.exports = TBMqttClient;
