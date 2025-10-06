/**
 * ThingsBoard REST API Client
 * Handles all HTTP communication with ThingsBoard server
 */

'use strict';

const axios = require('axios');

class TBRestClient {
    constructor(serverUrl, logger) {
        this.serverUrl = serverUrl.replace(/\/$/, ''); // Remove trailing slash
        this.logger = logger;
        this.token = null;
        this.refreshToken = null;
        
        // Create axios instance with default config
        this.client = axios.create({
            baseURL: this.serverUrl,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // Add request interceptor to inject token
        this.client.interceptors.request.use(
            (config) => {
                if (this.token) {
                    config.headers['X-Authorization'] = `Bearer ${this.token}`;
                }
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        // Add response interceptor to handle token refresh
        this.client.interceptors.response.use(
            (response) => response,
            async (error) => {
                const originalRequest = error.config;
                
                // If 401 and we haven't retried yet, try to refresh token
                if (error.response?.status === 401 && !originalRequest._retry) {
                    originalRequest._retry = true;
                    
                    try {
                        if (this.refreshToken) {
                            await this.refreshJwtToken();
                            return this.client(originalRequest);
                        }
                    } catch (refreshError) {
                        this.logger.error('Token refresh failed:', refreshError);
                        return Promise.reject(refreshError);
                    }
                }
                
                return Promise.reject(error);
            }
        );
    }

    /**
     * Authenticate with ThingsBoard and get JWT token
     * @param {string} username - Username (email)
     * @param {string} password - Password
     * @returns {Promise<string>} JWT token
     */
    async login(username, password) {
        try {
            const response = await this.client.post('/api/auth/login', {
                username: username,
                password: password
            });

            this.token = response.data.token;
            this.refreshToken = response.data.refreshToken;
            
            this.logger.info('ThingsBoard authentication successful');
            return this.token;

        } catch (error) {
            this.logger.error('ThingsBoard login failed:', error.message);
            throw new Error(`Login failed: ${error.response?.data?.message || error.message}`);
        }
    }

    /**
     * Refresh JWT token using refresh token
     */
    async refreshJwtToken() {
        try {
            const response = await this.client.post('/api/auth/token', {
                refreshToken: this.refreshToken
            });

            this.token = response.data.token;
            this.refreshToken = response.data.refreshToken;
            
            this.logger.info('ThingsBoard token refreshed');
            return this.token;

        } catch (error) {
            this.logger.error('Token refresh failed:', error.message);
            throw error;
        }
    }

    /**
     * Get list of tenant devices
     * @param {number} pageSize - Number of devices per page (default 100)
     * @param {number} page - Page number (default 0)
     * @returns {Promise<Array>} Array of devices
     */
    async getDevices(pageSize = 100, page = 0) {
        try {
            const response = await this.client.get('/api/tenant/devices', {
                params: {
                    pageSize: pageSize,
                    page: page
                }
            });

            return response.data.data || [];

        } catch (error) {
            this.logger.error('Failed to get devices:', error.message);
            throw error;
        }
    }

    /**
     * Get device by ID
     * @param {string} deviceId - Device ID
     * @returns {Promise<Object>} Device object
     */
    async getDevice(deviceId) {
        try {
            const response = await this.client.get(`/api/device/${deviceId}`);
            return response.data;

        } catch (error) {
            this.logger.error(`Failed to get device ${deviceId}:`, error.message);
            throw error;
        }
    }

    /**
     * Get telemetry keys for a device
     * @param {string} deviceId - Device ID
     * @returns {Promise<Array>} Array of telemetry keys
     */
    async getTelemetryKeys(deviceId) {
        try {
            const response = await this.client.get(
                `/api/plugins/telemetry/DEVICE/${deviceId}/keys/timeseries`
            );

            return response.data || [];

        } catch (error) {
            this.logger.error(`Failed to get telemetry keys for ${deviceId}:`, error.message);
            throw error;
        }
    }

    /**
     * Get latest telemetry values for specific keys
     * @param {string} deviceId - Device ID
     * @param {Array<string>} keys - Array of telemetry keys
     * @returns {Promise<Object>} Object with key-value pairs
     */
    async getLatestTelemetry(deviceId, keys) {
        try {
            const keysParam = Array.isArray(keys) ? keys.join(',') : keys;
            const response = await this.client.get(
                `/api/plugins/telemetry/DEVICE/${deviceId}/values/timeseries`,
                {
                    params: { keys: keysParam }
                }
            );

            // Transform response to simple key-value object
            const result = {};
            for (const key in response.data) {
                if (response.data[key] && response.data[key].length > 0) {
                    const latest = response.data[key][0];
                    result[key] = latest.value;
                    result.ts = latest.ts;
                }
            }

            return result;

        } catch (error) {
            this.logger.error(`Failed to get telemetry for ${deviceId}:`, error.message);
            throw error;
        }
    }

    /**
     * Get telemetry history
     * @param {string} deviceId - Device ID
     * @param {Array<string>} keys - Array of telemetry keys
     * @param {number} startTs - Start timestamp (ms)
     * @param {number} endTs - End timestamp (ms)
     * @param {number} limit - Max number of records
     * @returns {Promise<Object>} Historical telemetry data
     */
    async getTelemetryHistory(deviceId, keys, startTs, endTs, limit = 100) {
        try {
            const keysParam = Array.isArray(keys) ? keys.join(',') : keys;
            const response = await this.client.get(
                `/api/plugins/telemetry/DEVICE/${deviceId}/values/timeseries`,
                {
                    params: {
                        keys: keysParam,
                        startTs: startTs,
                        endTs: endTs,
                        limit: limit
                    }
                }
            );

            return response.data;

        } catch (error) {
            this.logger.error(`Failed to get telemetry history for ${deviceId}:`, error.message);
            throw error;
        }
    }

    /**
     * Get device attributes
     * @param {string} deviceId - Device ID
     * @param {string} scope - Attribute scope (CLIENT_SCOPE, SHARED_SCOPE, SERVER_SCOPE)
     * @returns {Promise<Array>} Array of attributes
     */
    async getAttributes(deviceId, scope = 'CLIENT_SCOPE') {
        try {
            const response = await this.client.get(
                `/api/plugins/telemetry/DEVICE/${deviceId}/values/attributes/${scope}`
            );

            return response.data || [];

        } catch (error) {
            this.logger.error(`Failed to get attributes for ${deviceId}:`, error.message);
            throw error;
        }
    }

    /**
     * Write shared attribute to device
     * @param {string} deviceId - Device ID
     * @param {string} key - Attribute key
     * @param {any} value - Attribute value
     * @returns {Promise<void>}
     */
    async writeSharedAttribute(deviceId, key, value) {
        try {
            const payload = { [key]: value };
            
            await this.client.post(
                `/api/plugins/telemetry/DEVICE/${deviceId}/attributes/SHARED_SCOPE`,
                payload
            );

            this.logger.info(`Wrote shared attribute ${key}=${value} to device ${deviceId}`);

        } catch (error) {
            this.logger.error(`Failed to write attribute to ${deviceId}:`, error.message);
            throw error;
        }
    }

    /**
     * Write multiple shared attributes to device
     * @param {string} deviceId - Device ID
     * @param {Object} attributes - Object with key-value pairs
     * @returns {Promise<void>}
     */
    async writeSharedAttributes(deviceId, attributes) {
        try {
            await this.client.post(
                `/api/plugins/telemetry/DEVICE/${deviceId}/attributes/SHARED_SCOPE`,
                attributes
            );

            this.logger.info(`Wrote ${Object.keys(attributes).length} attributes to device ${deviceId}`);

        } catch (error) {
            this.logger.error(`Failed to write attributes to ${deviceId}:`, error.message);
            throw error;
        }
    }

    /**
     * Send RPC command to device (two-way)
     * @param {string} deviceId - Device ID
     * @param {Object} command - Command object { method, params, timeout }
     * @returns {Promise<Object>} RPC response
     */
    async sendRpcCommand(deviceId, command) {
        try {
            const payload = {
                method: command.method,
                params: command.params || {},
                timeout: command.timeout || 5000
            };

            const response = await this.client.post(
                `/api/plugins/rpc/twoway/${deviceId}`,
                payload
            );

            this.logger.info(`Sent RPC command ${command.method} to device ${deviceId}`);
            return response.data;

        } catch (error) {
            this.logger.error(`Failed to send RPC command to ${deviceId}:`, error.message);
            throw error;
        }
    }

    /**
     * Send one-way RPC command to device
     * @param {string} deviceId - Device ID
     * @param {Object} command - Command object { method, params }
     * @returns {Promise<void>}
     */
    async sendOneWayRpcCommand(deviceId, command) {
        try {
            const payload = {
                method: command.method,
                params: command.params || {}
            };

            await this.client.post(
                `/api/plugins/rpc/oneway/${deviceId}`,
                payload
            );

            this.logger.info(`Sent one-way RPC command ${command.method} to device ${deviceId}`);

        } catch (error) {
            this.logger.error(`Failed to send one-way RPC command to ${deviceId}:`, error.message);
            throw error;
        }
    }

    /**
     * Get device credentials (for MQTT connection)
     * @param {string} deviceId - Device ID
     * @returns {Promise<Object>} Device credentials
     */
    async getDeviceCredentials(deviceId) {
        try {
            const response = await this.client.get(`/api/device/${deviceId}/credentials`);
            return response.data;

        } catch (error) {
            this.logger.error(`Failed to get credentials for ${deviceId}:`, error.message);
            throw error;
        }
    }

    /**
     * Search devices by name
     * @param {string} query - Search query
     * @returns {Promise<Array>} Array of matching devices
     */
    async searchDevices(query) {
        try {
            const response = await this.client.get('/api/tenant/devices', {
                params: {
                    textSearch: query,
                    pageSize: 50,
                    page: 0
                }
            });

            return response.data.data || [];

        } catch (error) {
            this.logger.error('Failed to search devices:', error.message);
            throw error;
        }
    }

    /**
     * Get device types
     * @returns {Promise<Array>} Array of device types
     */
    async getDeviceTypes() {
        try {
            const response = await this.client.get('/api/device/types');
            return response.data || [];

        } catch (error) {
            this.logger.error('Failed to get device types:', error.message);
            throw error;
        }
    }
}

module.exports = TBRestClient;
