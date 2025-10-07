/**
 * Script para crear un dispositivo ThingsBoard directamente en la BD
 * Uso: node create-thingsboard-device.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '_appdata', 'project.fuxap.db');

// Configuración del dispositivo
const device = {
    id: 'tb_' + Date.now(),
    name: 'ThingsBoard Local',
    type: 'ThingsBoard',
    enabled: true,
    polling: 5000,
    property: {
        serverUrl: 'http://localhost:8080',
        username: 'tenant@thingsboard.org',  // CAMBIA ESTO
        password: 'tenant',  // CAMBIA ESTO
        useMqtt: false,  // MQTT desactivado
        delay: 10,
        baudrate: 9600,
        databits: 8,
        stopbits: 1,
        parity: 'None'
    },
    tags: {}
};

console.log('Creando dispositivo ThingsBoard...');
console.log('Configuración:', JSON.stringify(device, null, 2));

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error al abrir la base de datos:', err);
        process.exit(1);
    }
    console.log('Base de datos abierta');
});

// Insertar el dispositivo
const deviceData = JSON.stringify(device);

db.run(
    'INSERT INTO devices (name, value) VALUES (?, ?)',
    [device.id, deviceData],
    function(err) {
        if (err) {
            console.error('Error al insertar dispositivo:', err);
            db.close();
            process.exit(1);
        }
        
        console.log('✅ Dispositivo creado exitosamente!');
        console.log('ID de fila:', this.lastID);
        console.log('\nReinicia el servidor FUXA para cargar el dispositivo.');
        console.log('Deberías ver en los logs:');
        console.log('  [INF] \'ThingsBoard Local\' ThingsBoard load() called');
        console.log('  [INF]   property.serverUrl: \'http://localhost:8080\'');
        console.log('  [INF]   Final useMqtt: false');
        console.log('\nSi useMqtt es false, NO deberías ver errores de MQTT.');
        
        db.close();
    }
);
