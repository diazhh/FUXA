/**
 * ThingsBoard Configuration Manager
 * Manages ThingsBoard connection settings and credentials
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.TB_ENCRYPTION_KEY || 'fuxa-thingsboard-key-32-chars!';
const ENCRYPTION_ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

class ThingsBoardConfig {
    constructor(settings, logger) {
        this.settings = settings;
        this.logger = logger;
        this.configFile = path.join(settings.workDir, 'thingsboard-config.json');
        this.config = null;
    }

    /**
     * Initialize configuration
     */
    async init() {
        try {
            await this.load();
            this.logger.info('thingsboard-config: initialized successfully', true);
            return true;
        } catch (err) {
            this.logger.info(`thingsboard-config: configuration not found, creating default...`, true);
            await this.setDefault();
            this.logger.info('thingsboard-config: initialized with default configuration', true);
            return true;
        }
    }

    /**
     * Load configuration from file
     */
    async load() {
        return new Promise((resolve, reject) => {
            if (fs.existsSync(this.configFile)) {
                try {
                    const data = fs.readFileSync(this.configFile, 'utf8');
                    this.config = JSON.parse(data);
                    
                    if (this.config.password) {
                        this.config.password = this.decrypt(this.config.password);
                    }
                    
                    this.logger.info('thingsboard-config: loaded from file', true);
                    resolve(this.config);
                } catch (err) {
                    this.logger.error(`thingsboard-config: failed to load! ${err}`);
                    reject(err);
                }
            } else {
                reject(new Error('Configuration file not found'));
            }
        });
    }

    /**
     * Save configuration to file
     */
    async save(config) {
        return new Promise((resolve, reject) => {
            try {
                const configToSave = { ...config };
                
                if (configToSave.password) {
                    configToSave.password = this.encrypt(configToSave.password);
                }
                
                fs.writeFileSync(this.configFile, JSON.stringify(configToSave, null, 2), 'utf8');
                
                this.config = { ...config };
                
                this.logger.info('thingsboard-config: saved successfully', true);
                resolve();
            } catch (err) {
                this.logger.error(`thingsboard-config: failed to save! ${err}`);
                reject(err);
            }
        });
    }

    /**
     * Set default configuration
     */
    async setDefault() {
        const defaultConfig = {
            enabled: true,
            host: 'localhost',
            port: 8080,
            protocol: 'http',
            username: 'master@gdt.com',
            password: '10203040',
            syncInterval: 30000,
            useWebSocket: true,
            reconnectInterval: 5000,
            maxReconnectAttempts: 10,
            requestTimeout: 10000,
            deviceFilter: {
                type: null,
                label: null
            },
            telemetryKeys: {
                includeAll: true,
                whitelist: [],
                blacklist: []
            }
        };

        await this.save(defaultConfig);
        this.logger.info('thingsboard-config: default configuration set', true);
        return defaultConfig;
    }

    /**
     * Get current configuration
     */
    getConfig() {
        return this.config;
    }

    /**
     * Update configuration
     */
    async updateConfig(updates) {
        const newConfig = {
            ...this.config,
            ...updates
        };
        await this.save(newConfig);
        return newConfig;
    }

    /**
     * Get ThingsBoard base URL
     */
    getBaseUrl() {
        if (!this.config) {
            return null;
        }
        const { protocol, host, port } = this.config;
        return `${protocol}://${host}:${port}`;
    }

    /**
     * Check if ThingsBoard integration is enabled
     */
    isEnabled() {
        return this.config && this.config.enabled === true;
    }

    /**
     * Encrypt password
     */
    encrypt(text) {
        try {
            const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
            const iv = crypto.randomBytes(IV_LENGTH);
            const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
            
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            return iv.toString('hex') + ':' + encrypted;
        } catch (err) {
            this.logger.error(`thingsboard-config: encryption failed! ${err}`);
            return text;
        }
    }

    /**
     * Decrypt password
     */
    decrypt(text) {
        try {
            const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
            const parts = text.split(':');
            
            if (parts.length !== 2) {
                return text;
            }
            
            const iv = Buffer.from(parts[0], 'hex');
            const encryptedText = parts[1];
            const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
            
            let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (err) {
            this.logger.error(`thingsboard-config: decryption failed! ${err}`);
            return text;
        }
    }

    /**
     * Validate configuration
     */
    validate(config) {
        const errors = [];

        if (!config.host) {
            errors.push('Host is required');
        }

        if (!config.username) {
            errors.push('Username is required');
        }

        if (!config.password) {
            errors.push('Password is required');
        }

        if (config.port && (config.port < 1 || config.port > 65535)) {
            errors.push('Port must be between 1 and 65535');
        }

        if (config.protocol && !['http', 'https'].includes(config.protocol)) {
            errors.push('Protocol must be http or https');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}

module.exports = ThingsBoardConfig;
