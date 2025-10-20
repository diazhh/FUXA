/**
 * ThingsBoard REST API Client
 * Handles authentication and communication with ThingsBoard server
 */

'use strict';

const axios = require('axios');
const WebSocket = require('ws');
const EventEmitter = require('events');

class ThingsBoardClient extends EventEmitter {
    constructor(config, logger) {
        super();
        this.config = config;
        this.logger = logger;
        this.token = null;
        this.refreshToken = null;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.isConnected = false;
        this.reconnectTimer = null;
        this.subscriptions = new Map();
        
        this.axiosInstance = axios.create({
            timeout: config.requestTimeout || 10000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Authenticate with ThingsBoard
     */
    async authenticate() {
        try {
            const baseUrl = `${this.config.protocol}://${this.config.host}:${this.config.port}`;
            const url = `${baseUrl}/api/auth/login`;
            
            this.logger.info(`thingsboard-client: authenticating with ${this.config.host}...`);
            
            const response = await this.axiosInstance.post(url, {
                username: this.config.username,
                password: this.config.password
            });

            if (response.data && response.data.token) {
                this.token = response.data.token;
                this.refreshToken = response.data.refreshToken;
                this.isConnected = true;
                this.reconnectAttempts = 0;
                
                this.axiosInstance.defaults.headers.common['X-Authorization'] = `Bearer ${this.token}`;
                
                this.logger.info('thingsboard-client: authenticated successfully', true);
                this.emit('connected');
                
                return true;
            } else {
                throw new Error('Invalid authentication response');
            }
        } catch (err) {
            this.isConnected = false;
            const errorMsg = err.response?.data?.message || err.message;
            this.logger.error(`thingsboard-client: authentication failed! ${errorMsg}`);
            this.emit('error', err);
            throw err;
        }
    }

    /**
     * Refresh authentication token
     */
    async refreshAuthToken() {
        try {
            if (!this.refreshToken) {
                return await this.authenticate();
            }

            const baseUrl = `${this.config.protocol}://${this.config.host}:${this.config.port}`;
            const url = `${baseUrl}/api/auth/token`;
            
            const response = await this.axiosInstance.post(url, {
                refreshToken: this.refreshToken
            });

            if (response.data && response.data.token) {
                this.token = response.data.token;
                this.refreshToken = response.data.refreshToken;
                this.axiosInstance.defaults.headers.common['X-Authorization'] = `Bearer ${this.token}`;
                
                this.logger.info('thingsboard-client: token refreshed successfully', true);
                return true;
            }
        } catch (err) {
            this.logger.error(`thingsboard-client: token refresh failed! ${err.message}`);
            return await this.authenticate();
        }
    }

    /**
     * Get all devices from ThingsBoard
     */
    async getDevices(pageSize = 1000, page = 0) {
        try {
            if (!this.token) {
                this.logger.info('thingsboard-client: no token, authenticating...');
                await this.authenticate();
            }

            const baseUrl = `${this.config.protocol}://${this.config.host}:${this.config.port}`;
            const url = `${baseUrl}/api/tenant/devices`;
            
            this.logger.info(`thingsboard-client: fetching devices from ${url}`);
            
            const response = await this.axiosInstance.get(url, {
                params: {
                    pageSize,
                    page
                }
            });

            this.logger.info(`thingsboard-client: response status ${response.status}`);

            if (response.data && response.data.data) {
                this.logger.info(`thingsboard-client: retrieved ${response.data.data.length} devices`, true);
                return response.data.data;
            }

            this.logger.warn('thingsboard-client: response has no data.data field');
            return [];
        } catch (err) {
            if (err.response?.status === 401) {
                this.logger.warn('thingsboard-client: 401 unauthorized, refreshing token...');
                await this.refreshAuthToken();
                return await this.getDevices(pageSize, page);
            }
            
            this.logger.error(`thingsboard-client: failed to get devices! ${err.message}`);
            if (err.response) {
                this.logger.error(`thingsboard-client: response status: ${err.response.status}, data: ${JSON.stringify(err.response.data)}`);
            }
            throw err;
        }
    }

    /**
     * Get device by ID
     */
    async getDevice(deviceId) {
        try {
            if (!this.token) {
                await this.authenticate();
            }

            const baseUrl = `${this.config.protocol}://${this.config.host}:${this.config.port}`;
            const url = `${baseUrl}/api/device/${deviceId}`;
            
            const response = await this.axiosInstance.get(url);

            if (response.data) {
                return response.data;
            }

            return null;
        } catch (err) {
            if (err.response?.status === 401) {
                await this.refreshAuthToken();
                return await this.getDevice(deviceId);
            }
            
            this.logger.error(`thingsboard-client: failed to get device ${deviceId}! ${err.message}`);
            throw err;
        }
    }

    /**
     * Get telemetry keys for a device
     */
    async getTelemetryKeys(deviceId) {
        try {
            if (!this.token) {
                await this.authenticate();
            }

            const baseUrl = `${this.config.protocol}://${this.config.host}:${this.config.port}`;
            const url = `${baseUrl}/api/plugins/telemetry/DEVICE/${deviceId}/keys/timeseries`;
            
            const response = await this.axiosInstance.get(url);

            if (response.data) {
                this.logger.info(`thingsboard-client: retrieved ${response.data.length} telemetry keys for device ${deviceId}`, true);
                return response.data;
            }

            return [];
        } catch (err) {
            if (err.response?.status === 401) {
                await this.refreshAuthToken();
                return await this.getTelemetryKeys(deviceId);
            }
            
            this.logger.error(`thingsboard-client: failed to get telemetry keys for device ${deviceId}! ${err.message}`);
            throw err;
        }
    }

    /**
     * Get latest telemetry values for a device
     */
    async getLatestTelemetry(deviceId, keys = null) {
        try {
            if (!this.token) {
                await this.authenticate();
            }

            const baseUrl = `${this.config.protocol}://${this.config.host}:${this.config.port}`;
            let url = `${baseUrl}/api/plugins/telemetry/DEVICE/${deviceId}/values/timeseries`;
            
            if (keys && keys.length > 0) {
                url += `?keys=${keys.join(',')}`;
            }
            
            const response = await this.axiosInstance.get(url);

            if (response.data) {
                return response.data;
            }

            return {};
        } catch (err) {
            if (err.response?.status === 401) {
                await this.refreshAuthToken();
                return await this.getLatestTelemetry(deviceId, keys);
            }
            
            this.logger.error(`thingsboard-client: failed to get telemetry for device ${deviceId}! ${err.message}`);
            throw err;
        }
    }

    /**
     * Get telemetry history
     */
    async getTelemetryHistory(deviceId, keys, startTs, endTs, limit = 100) {
        try {
            if (!this.token) {
                await this.authenticate();
            }

            const baseUrl = `${this.config.protocol}://${this.config.host}:${this.config.port}`;
            const url = `${baseUrl}/api/plugins/telemetry/DEVICE/${deviceId}/values/timeseries`;
            
            const response = await this.axiosInstance.get(url, {
                params: {
                    keys: keys.join(','),
                    startTs,
                    endTs,
                    limit
                }
            });

            if (response.data) {
                return response.data;
            }

            return {};
        } catch (err) {
            if (err.response?.status === 401) {
                await this.refreshAuthToken();
                return await this.getTelemetryHistory(deviceId, keys, startTs, endTs, limit);
            }
            
            this.logger.error(`thingsboard-client: failed to get telemetry history for device ${deviceId}! ${err.message}`);
            throw err;
        }
    }

    /**
     * Send telemetry to device (if supported)
     */
    async sendTelemetry(deviceId, telemetry) {
        try {
            if (!this.token) {
                await this.authenticate();
            }

            const baseUrl = `${this.config.protocol}://${this.config.host}:${this.config.port}`;
            const url = `${baseUrl}/api/plugins/telemetry/DEVICE/${deviceId}/timeseries/ANY`;
            
            const response = await this.axiosInstance.post(url, telemetry);

            this.logger.info(`thingsboard-client: telemetry sent to device ${deviceId}`, true);
            return response.data;
        } catch (err) {
            if (err.response?.status === 401) {
                await this.refreshAuthToken();
                return await this.sendTelemetry(deviceId, telemetry);
            }
            
            this.logger.error(`thingsboard-client: failed to send telemetry to device ${deviceId}! ${err.message}`);
            throw err;
        }
    }

    /**
     * Connect to WebSocket for real-time updates
     */
    async connectWebSocket() {
        try {
            if (!this.token) {
                await this.authenticate();
            }

            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.logger.info('thingsboard-client: WebSocket already connected');
                return;
            }

            const wsProtocol = this.config.protocol === 'https' ? 'wss' : 'ws';
            const wsUrl = `${wsProtocol}://${this.config.host}:${this.config.port}/api/ws/plugins/telemetry?token=${this.token}`;
            
            this.logger.info('thingsboard-client: connecting to WebSocket...');
            
            this.ws = new WebSocket(wsUrl);

            this.ws.on('open', () => {
                this.logger.info('thingsboard-client: WebSocket connected', true);
                this.emit('ws-connected');
                this.reconnectAttempts = 0;
            });

            this.ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data);
                    this.handleWebSocketMessage(message);
                } catch (err) {
                    this.logger.error(`thingsboard-client: failed to parse WebSocket message! ${err.message}`);
                }
            });

            this.ws.on('error', (err) => {
                this.logger.error(`thingsboard-client: WebSocket error! ${err.message}`);
                this.emit('ws-error', err);
            });

            this.ws.on('close', () => {
                this.logger.warn('thingsboard-client: WebSocket disconnected');
                this.emit('ws-disconnected');
                this.scheduleReconnect();
            });

        } catch (err) {
            this.logger.error(`thingsboard-client: failed to connect WebSocket! ${err.message}`);
            this.scheduleReconnect();
        }
    }

    /**
     * Subscribe to device telemetry via WebSocket
     */
    subscribeToTelemetry(deviceId, keys = null) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            this.logger.warn('thingsboard-client: WebSocket not connected, cannot subscribe');
            return null;
        }

        const cmdId = Date.now();
        const subscription = {
            tsSubCmds: [{
                entityType: 'DEVICE',
                entityId: deviceId,
                scope: 'LATEST_TELEMETRY',
                cmdId
            }],
            historyCmds: [],
            attrSubCmds: []
        };

        if (keys && keys.length > 0) {
            subscription.tsSubCmds[0].keys = keys.join(',');
        }

        this.ws.send(JSON.stringify(subscription));
        this.subscriptions.set(cmdId, { deviceId, keys });
        
        this.logger.info(`thingsboard-client: subscribed to telemetry for device ${deviceId}`, true);
        return cmdId;
    }

    /**
     * Unsubscribe from device telemetry
     */
    unsubscribeFromTelemetry(cmdId) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return;
        }

        const unsubscribe = {
            tsSubCmds: [{
                cmdId,
                unsubscribe: true
            }]
        };

        this.ws.send(JSON.stringify(unsubscribe));
        this.subscriptions.delete(cmdId);
        
        this.logger.info(`thingsboard-client: unsubscribed from telemetry (cmdId: ${cmdId})`, true);
    }

    /**
     * Handle WebSocket messages
     */
    handleWebSocketMessage(message) {
        if (message.subscriptionId && message.data) {
            const subscription = this.subscriptions.get(message.subscriptionId);
            if (subscription) {
                this.emit('telemetry-update', {
                    deviceId: subscription.deviceId,
                    data: message.data
                });
            }
        }
    }

    /**
     * Schedule reconnection attempt
     */
    scheduleReconnect() {
        if (this.reconnectTimer) {
            return;
        }

        if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
            this.logger.error('thingsboard-client: max reconnection attempts reached');
            this.emit('max-reconnect-attempts');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.config.reconnectInterval || 5000;
        
        this.logger.info(`thingsboard-client: scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
        
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connectWebSocket();
        }, delay);
    }

    /**
     * Disconnect from ThingsBoard
     */
    disconnect() {
        this.isConnected = false;
        
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }

        this.subscriptions.clear();
        this.logger.info('thingsboard-client: disconnected');
        this.emit('disconnected');
    }

    /**
     * Check if client is connected
     */
    isClientConnected() {
        return this.isConnected && this.token !== null;
    }

    /**
     * Get connection status
     */
    getStatus() {
        return {
            connected: this.isConnected,
            hasToken: this.token !== null,
            wsConnected: this.ws && this.ws.readyState === WebSocket.OPEN,
            reconnectAttempts: this.reconnectAttempts,
            subscriptions: this.subscriptions.size
        };
    }
}

module.exports = ThingsBoardClient;
