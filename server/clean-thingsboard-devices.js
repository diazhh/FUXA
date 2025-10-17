/**
 * Script para limpiar dispositivos ThingsBoard antiguos
 * Ejecutar: node clean-thingsboard-devices.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '_appdata', 'project.fuxap.db');

console.log('Abriendo base de datos:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error al abrir la base de datos:', err);
        process.exit(1);
    }
    console.log('Base de datos abierta correctamente');
});

// Leer el proyecto actual
db.get('SELECT * FROM project LIMIT 1', (err, row) => {
    if (err) {
        console.error('Error al leer proyecto:', err);
        db.close();
        process.exit(1);
    }

    if (!row) {
        console.log('No se encontró proyecto');
        db.close();
        process.exit(0);
    }

    try {
        const project = JSON.parse(row.data);
        console.log('\n=== Dispositivos encontrados ===');
        
        if (project.devices) {
            Object.keys(project.devices).forEach(deviceId => {
                const device = project.devices[deviceId];
                console.log(`- ${device.name} (${device.type})`);
                
                // Si es ThingsBoard, mostrar propiedades
                if (device.type === 'ThingsBoard') {
                    console.log('  Propiedades:', JSON.stringify(device.property, null, 2));
                }
            });
        }

        console.log('\n=== Opciones ===');
        console.log('1. Para eliminar dispositivos ThingsBoard antiguos, edítalos desde la UI');
        console.log('2. O elimina manualmente el archivo: _appdata/project.fuxap.db');
        console.log('3. Y reinicia el servidor para empezar con proyecto limpio');
        
    } catch (e) {
        console.error('Error al parsear proyecto:', e);
    }

    db.close();
});
