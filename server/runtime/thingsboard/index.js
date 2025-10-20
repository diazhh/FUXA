/**
 * ThingsBoard Integration Module
 * Direct gateway to ThingsBoard - NO local storage, NO sync
 * All data is fetched on-demand from ThingsBoard
 */

'use strict';

const ThingsBoardConfig = require('./tb-config');
const ThingsBoardClient = require('./tb-client');

class ThingsBoardManager {
    constructor(settings, logger) {
        this.settings = settings;
        this.logger = logger;
        this.config = null;
        this.client = null;
        this.initialized = false;
    }

    /**
     * Initialize ThingsBoard integration
     */
    async init() {
        try {
            this.logger.info('thingsboard: initializing direct gateway...', true);

            this.config = new ThingsBoardConfig(this.settings, this.logger);
            this.logger.info('thingsboard: config created, calling init...', true);
            await this.config.init();
            this.logger.info('thingsboard: config initialized', true);

            if (!this.config.isEnabled()) {
                this.logger.info('thingsboard: integration is disabled', true);
                this.initialized = false;
                return false;
            }

            this.logger.info('thingsboard: integration is enabled, creating client...', true);
            const tbConfig = this.config.getConfig();
            this.client = new ThingsBoardClient(tbConfig, this.logger);
            this.logger.info('thingsboard: client created, authenticating...', true);
            
            try {
                await this.client.authenticate();
                this.logger.info('thingsboard: authenticated successfully', true);
            } catch (authErr) {
                this.logger.error(`thingsboard: authentication failed! ${authErr.message}`);
                if (authErr.stack) {
                    this.logger.error(`thingsboard: auth stack: ${authErr.stack}`);
                }
                // Don't throw, allow queries to retry authentication
            }

            this.initialized = true;
            this.logger.info('thingsboard: direct gateway initialized successfully', true);
            
            return true;
        } catch (err) {
            this.logger.error(`thingsboard: initialization failed! ${err.message}`);
            if (err.stack) {
                this.logger.error(`thingsboard: init stack: ${err.stack}`);
            }
            this.initialized = false;
            return false;
        }
    }

    /**
     * Start is no longer needed - we query on-demand
     */
    async start() {
        if (!this.initialized) {
            throw new Error('ThingsBoard manager not initialized');
        }

        if (!this.config.isEnabled()) {
            this.logger.info('thingsboard: integration is disabled');
            return;
        }

        // Ensure client is authenticated
        if (!this.client.isClientConnected()) {
            this.logger.info('thingsboard: authenticating...', true);
            await this.client.authenticate();
        }
        
        this.logger.info('thingsboard: direct gateway ready', true);
    }

    /**
     * Stop ThingsBoard client
     */
    stop() {
        if (this.client) {
            this.client.disconnect();
        }
        
        this.logger.info('thingsboard: stopped', true);
    }

    /**
     * Get all devices from ThingsBoard (on-demand query)
     */
    async getDevices() {
        if (!this.client) {
            return [];
        }
        try {
            const devices = await this.client.getDevices();
            this.logger.info(`thingsboard: fetched ${devices.length} devices on-demand`);
            return devices;
        } catch (err) {
            this.logger.error(`thingsboard: failed to fetch devices! ${err.message}`);
            return [];
        }
    }

    /**
     * Get device by ID from ThingsBoard (on-demand query)
     */
    async getDevice(deviceId) {
        if (!this.client) {
            return null;
        }
        try {
            return await this.client.getDevice(deviceId);
        } catch (err) {
            this.logger.error(`thingsboard: failed to fetch device ${deviceId}! ${err.message}`);
            return null;
        }
    }

    /**
     * Get telemetry keys for a device (on-demand query)
     */
    async getTelemetryKeys(deviceId) {
        if (!this.client) {
            return [];
        }
        try {
            return await this.client.getTelemetryKeys(deviceId);
        } catch (err) {
            this.logger.error(`thingsboard: failed to fetch telemetry keys! ${err.message}`);
            return [];
        }
    }

    /**
     * Get latest telemetry for a device (on-demand query)
     */
    async getLatestTelemetry(deviceId, keys = null) {
        if (!this.client) {
            return {};
        }
        try {
            return await this.client.getLatestTelemetry(deviceId, keys);
        } catch (err) {
            this.logger.error(`thingsboard: failed to fetch telemetry! ${err.message}`);
            return {};
        }
    }

    /**
     * Send telemetry to ThingsBoard (direct write)
     */
    async sendTelemetry(deviceId, telemetry) {
        if (!this.client) {
            throw new Error('ThingsBoard client not initialized');
        }
        try {
            await this.client.sendTelemetry(deviceId, telemetry);
            this.logger.info(`thingsboard: sent telemetry to device ${deviceId}`, true);
            return true;
        } catch (err) {
            this.logger.error(`thingsboard: failed to send telemetry! ${err.message}`);
            throw err;
        }
    }

    /**
     * Get configuration
     */
    getConfiguration() {
        if (!this.config) {
            return null;
        }
        return this.config.getConfig();
    }

    /**
     * Update configuration
     */
    async updateConfiguration(updates) {
        if (!this.config) {
            throw new Error('ThingsBoard config not initialized');
        }

        await this.config.updateConfig(updates);

        if (this.client) {
            this.client.disconnect();
        }

        await this.init();
        
        if (this.config.isEnabled()) {
            await this.start();
        }

        this.logger.info('thingsboard: configuration updated and restarted', true);
    }

    /**
     * Get status
     */
    getStatus() {
        if (!this.initialized) {
            return {
                initialized: false,
                enabled: false
            };
        }

        return {
            initialized: true,
            enabled: this.config.isEnabled(),
            client: {
                connected: this.client ? this.client.isClientConnected() : false,
                authenticated: this.client && this.client.token ? true : false
            }
        };
    }

    /**
     * Check if ThingsBoard integration is enabled
     */
    isEnabled() {
        return this.initialized && this.config && this.config.isEnabled();
    }
}

module.exports = {
    ThingsBoardManager,
    ThingsBoardConfig,
    ThingsBoardClient
};
