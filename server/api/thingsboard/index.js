/**
 * ThingsBoard API Endpoints
 * Provides REST API for ThingsBoard integration
 */

'use strict';

var express = require('express');

var runtime;
var secureFnc;
var checkGroupsFnc;

function init(_runtime, _secureFnc, _checkGroupsFnc) {
    runtime = _runtime;
    secureFnc = _secureFnc;
    checkGroupsFnc = _checkGroupsFnc;
}

function app() {
    var tbApp = express();

    /**
     * GET ThingsBoard configuration
     */
    tbApp.get('/api/thingsboard/config', secureFnc, function(req, res) {
        const permission = checkGroupsFnc(req);
        if (res.statusCode === 403) {
            runtime.logger.error('api get thingsboard config: Token Expired');
        } else if (!permission || permission.groups < 0) {
            res.status(401).json({error: 'unauthorized_error', message: 'Unauthorized!'});
            runtime.logger.error('api get thingsboard config: Unauthorized');
        } else {
            try {
                if (!runtime.thingsboard) {
                    res.status(503).json({error: 'service_unavailable', message: 'ThingsBoard integration not initialized'});
                    return;
                }

                const config = runtime.thingsboard.getConfiguration();
                if (config) {
                    // Remove sensitive data
                    const safeConfig = { ...config };
                    delete safeConfig.password;
                    res.json(safeConfig);
                } else {
                    res.status(404).json({error: 'not_found', message: 'Configuration not found'});
                }
            } catch (err) {
                res.status(500).json({error: 'server_error', message: err.message});
                runtime.logger.error(`api get thingsboard config: ${err.message}`);
            }
        }
    });

    /**
     * POST Update ThingsBoard configuration
     */
    tbApp.post('/api/thingsboard/config', secureFnc, function(req, res) {
        const permission = checkGroupsFnc(req);
        if (res.statusCode === 403) {
            runtime.logger.error('api post thingsboard config: Token Expired');
        } else if (!permission || permission.groups < 0) {
            res.status(401).json({error: 'unauthorized_error', message: 'Unauthorized!'});
            runtime.logger.error('api post thingsboard config: Unauthorized');
        } else {
            try {
                if (!runtime.thingsboard) {
                    res.status(503).json({error: 'service_unavailable', message: 'ThingsBoard integration not initialized'});
                    return;
                }

                const updates = req.body;
                
                runtime.thingsboard.updateConfiguration(updates).then(() => {
                    res.json({success: true, message: 'Configuration updated successfully'});
                    runtime.logger.info('api post thingsboard config: Configuration updated', true);
                }).catch(err => {
                    res.status(500).json({error: 'update_failed', message: err.message});
                    runtime.logger.error(`api post thingsboard config: ${err.message}`);
                });
            } catch (err) {
                res.status(500).json({error: 'server_error', message: err.message});
                runtime.logger.error(`api post thingsboard config: ${err.message}`);
            }
        }
    });

    /**
     * GET ThingsBoard status
     */
    tbApp.get('/api/thingsboard/status', secureFnc, function(req, res) {
        const permission = checkGroupsFnc(req);
        if (res.statusCode === 403) {
            runtime.logger.error('api get thingsboard status: Token Expired');
        } else if (!permission || permission.groups < 0) {
            res.status(401).json({error: 'unauthorized_error', message: 'Unauthorized!'});
            runtime.logger.error('api get thingsboard status: Unauthorized');
        } else {
            try {
                if (!runtime.thingsboard) {
                    res.json({
                        initialized: false,
                        enabled: false,
                        connected: false
                    });
                    return;
                }

                const status = runtime.thingsboard.getStatus();
                res.json(status);
            } catch (err) {
                res.status(500).json({error: 'server_error', message: err.message});
                runtime.logger.error(`api get thingsboard status: ${err.message}`);
            }
        }
    });

    /**
     * GET ThingsBoard devices (on-demand query)
     */
    tbApp.get('/api/thingsboard/devices', secureFnc, async function(req, res) {
        const permission = checkGroupsFnc(req);
        if (res.statusCode === 403) {
            runtime.logger.error('api get thingsboard devices: Token Expired');
        } else if (!permission || permission.groups < 0) {
            res.status(401).json({error: 'unauthorized_error', message: 'Unauthorized!'});
            runtime.logger.error('api get thingsboard devices: Unauthorized');
        } else {
            try {
                if (!runtime.thingsboard || !runtime.thingsboard.isEnabled()) {
                    res.json([]);
                    return;
                }

                // Query devices directly from ThingsBoard
                const devices = await runtime.thingsboard.getDevices();
                res.json(devices);
            } catch (err) {
                res.status(500).json({error: 'server_error', message: err.message});
                runtime.logger.error(`api get thingsboard devices: ${err.message}`);
            }
        }
    });

    /**
     * GET ThingsBoard device by ID (on-demand query)
     */
    tbApp.get('/api/thingsboard/device/:id', secureFnc, async function(req, res) {
        const permission = checkGroupsFnc(req);
        if (res.statusCode === 403) {
            runtime.logger.error('api get thingsboard device: Token Expired');
        } else if (!permission || permission.groups < 0) {
            res.status(401).json({error: 'unauthorized_error', message: 'Unauthorized!'});
            runtime.logger.error('api get thingsboard device: Unauthorized');
        } else {
            try {
                if (!runtime.thingsboard || !runtime.thingsboard.isEnabled()) {
                    res.status(404).json({error: 'not_found', message: 'Device not found'});
                    return;
                }

                const device = await runtime.thingsboard.getDevice(req.params.id);
                if (device) {
                    res.json(device);
                } else {
                    res.status(404).json({error: 'not_found', message: 'Device not found'});
                }
            } catch (err) {
                res.status(500).json({error: 'server_error', message: err.message});
                runtime.logger.error(`api get thingsboard device: ${err.message}`);
            }
        }
    });

    /**
     * GET Telemetry keys for a device (on-demand query)
     */
    tbApp.get('/api/thingsboard/device/:id/keys', secureFnc, async function(req, res) {
        const permission = checkGroupsFnc(req);
        if (res.statusCode === 403) {
            runtime.logger.error('api get thingsboard telemetry keys: Token Expired');
        } else if (!permission || permission.groups < 0) {
            res.status(401).json({error: 'unauthorized_error', message: 'Unauthorized!'});
            runtime.logger.error('api get thingsboard telemetry keys: Unauthorized');
        } else {
            try {
                if (!runtime.thingsboard || !runtime.thingsboard.isEnabled()) {
                    res.json([]);
                    return;
                }

                const keys = await runtime.thingsboard.getTelemetryKeys(req.params.id);
                res.json(keys);
            } catch (err) {
                res.status(500).json({error: 'server_error', message: err.message});
                runtime.logger.error(`api get thingsboard telemetry keys: ${err.message}`);
            }
        }
    });

    /**
     * GET Latest telemetry for a device (on-demand query)
     */
    tbApp.get('/api/thingsboard/device/:id/telemetry', secureFnc, async function(req, res) {
        const permission = checkGroupsFnc(req);
        if (res.statusCode === 403) {
            runtime.logger.error('api get thingsboard telemetry: Token Expired');
        } else if (!permission || permission.groups < 0) {
            res.status(401).json({error: 'unauthorized_error', message: 'Unauthorized!'});
            runtime.logger.error('api get thingsboard telemetry: Unauthorized');
        } else {
            try {
                if (!runtime.thingsboard || !runtime.thingsboard.isEnabled()) {
                    res.json({});
                    return;
                }

                const keys = req.query.keys ? req.query.keys.split(',') : null;
                const telemetry = await runtime.thingsboard.getLatestTelemetry(req.params.id, keys);
                res.json(telemetry);
            } catch (err) {
                res.status(500).json({error: 'server_error', message: err.message});
                runtime.logger.error(`api get thingsboard telemetry: ${err.message}`);
            }
        }
    });


    /**
     * GET Historical telemetry data for charts
     */
    tbApp.get('/api/thingsboard/device/:id/history', secureFnc, async function(req, res) {
        const permission = checkGroupsFnc(req);
        if (res.statusCode === 403) {
            runtime.logger.error('api get thingsboard history: Token Expired');
        } else if (!permission || permission.groups < 0) {
            res.status(401).json({error: 'unauthorized_error', message: 'Unauthorized!'});
            runtime.logger.error('api get thingsboard history: Unauthorized');
        } else {
            try {
                if (!runtime.thingsboard || !runtime.thingsboard.isEnabled()) {
                    res.json([]);
                    return;
                }

                const deviceId = req.params.id;
                const keys = req.query.keys ? req.query.keys.split(',') : [];
                const startTs = parseInt(req.query.startTs);
                const endTs = parseInt(req.query.endTs);
                const limit = parseInt(req.query.limit) || 1000;

                if (!keys.length || !startTs || !endTs) {
                    res.status(400).json({error: 'bad_request', message: 'Missing required parameters: keys, startTs, endTs'});
                    return;
                }

                const history = await runtime.thingsboard.getTelemetryHistory(deviceId, keys, startTs, endTs, limit);
                res.json(history);
            } catch (err) {
                res.status(500).json({error: 'server_error', message: err.message});
                runtime.logger.error(`api get thingsboard history: ${err.message}`);
            }
        }
    });

    /**
     * POST Test ThingsBoard connection
     */
    tbApp.post('/api/thingsboard/test', secureFnc, function(req, res) {
        const permission = checkGroupsFnc(req);
        if (res.statusCode === 403) {
            runtime.logger.error('api post thingsboard test: Token Expired');
        } else if (!permission || permission.groups < 0) {
            res.status(401).json({error: 'unauthorized_error', message: 'Unauthorized!'});
            runtime.logger.error('api post thingsboard test: Unauthorized');
        } else {
            try {
                const { ThingsBoardClient } = require('../../runtime/thingsboard');
                const config = req.body;

                const testClient = new ThingsBoardClient(config, runtime.logger);
                
                testClient.authenticate().then(() => {
                    testClient.disconnect();
                    res.json({
                        success: true,
                        message: 'Connection successful',
                        connected: true
                    });
                }).catch(err => {
                    res.status(400).json({
                        success: false,
                        message: err.message,
                        connected: false
                    });
                });
            } catch (err) {
                res.status(500).json({error: 'server_error', message: err.message});
                runtime.logger.error(`api post thingsboard test: ${err.message}`);
            }
        }
    });

    return tbApp;
}

module.exports = {
    init: init,
    app: app
};
