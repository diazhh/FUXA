# Configuración de Credenciales ThingsBoard

## 📍 Ubicación del Archivo de Configuración

```
/home/jsalazar-fcore/FUXA/_appdata/thingsboard-config.json
```

Este archivo se crea automáticamente la primera vez que FUXA inicia si no existe.

---

## 🔧 Estructura del Archivo

```json
{
  "enabled": true,
  "host": "192.168.31.113",
  "port": 8081,
  "protocol": "http",
  "username": "tenant@thingsboard.org",
  "password": "iv:encrypted_password_here",
  "syncInterval": 30000,
  "useWebSocket": true,
  "reconnectInterval": 5000,
  "maxReconnectAttempts": 10,
  "requestTimeout": 10000,
  "deviceFilter": {
    "type": null,
    "label": null
  },
  "telemetryKeys": {
    "includeAll": true,
    "whitelist": [],
    "blacklist": []
  }
}
```

---

## 📝 Parámetros de Configuración

### Parámetros Básicos

| Parámetro | Tipo | Descripción | Ejemplo |
|-----------|------|-------------|---------|
| `enabled` | boolean | Habilita/deshabilita la integración | `true` |
| `host` | string | IP o hostname de ThingsBoard | `"192.168.31.113"` |
| `port` | number | Puerto de ThingsBoard | `8081` |
| `protocol` | string | Protocolo HTTP o HTTPS | `"http"` o `"https"` |
| `username` | string | Usuario de ThingsBoard | `"tenant@thingsboard.org"` |
| `password` | string | Contraseña (se encripta automáticamente) | `"tenant"` |

### Parámetros Avanzados

| Parámetro | Tipo | Descripción | Valor por Defecto |
|-----------|------|-------------|-------------------|
| `syncInterval` | number | Intervalo de sincronización (ms) - NO USADO | `30000` |
| `useWebSocket` | boolean | Usar WebSocket - NO IMPLEMENTADO | `true` |
| `reconnectInterval` | number | Intervalo de reconexión (ms) | `5000` |
| `maxReconnectAttempts` | number | Máximo de intentos de reconexión | `10` |
| `requestTimeout` | number | Timeout de peticiones HTTP (ms) | `10000` |

### Filtros de Devices (Futuro)

| Parámetro | Tipo | Descripción | Valor por Defecto |
|-----------|------|-------------|-------------------|
| `deviceFilter.type` | string | Filtrar devices por tipo | `null` (todos) |
| `deviceFilter.label` | string | Filtrar devices por etiqueta | `null` (todos) |

### Filtros de Telemetría (Futuro)

| Parámetro | Tipo | Descripción | Valor por Defecto |
|-----------|------|-------------|-------------------|
| `telemetryKeys.includeAll` | boolean | Incluir todas las claves | `true` |
| `telemetryKeys.whitelist` | array | Claves permitidas | `[]` |
| `telemetryKeys.blacklist` | array | Claves excluidas | `[]` |

---

## 🔐 Encriptación de Contraseñas

### Formato Almacenado

Las contraseñas se guardan en formato:
```
iv:encrypted_password
```

Ejemplo:
```
"password": "a1b2c3d4e5f6:9f8e7d6c5b4a3210fedcba9876543210"
```

### Algoritmo de Encriptación

- **Algoritmo:** AES-256-CBC
- **Clave:** Derivada con scrypt de `TB_ENCRYPTION_KEY`
- **IV:** 16 bytes aleatorios por cada encriptación
- **Salt:** `"salt"` (fijo)

### Cambiar la Clave de Encriptación

Por defecto, la clave es: `fuxa-thingsboard-key-32-chars!`

Para usar una clave personalizada:

```bash
export TB_ENCRYPTION_KEY="tu-clave-secreta-de-32-caracteres!"
```

⚠️ **IMPORTANTE:** Si cambias la clave, debes re-encriptar las contraseñas existentes.

---

## 🛠️ Cómo Cambiar las Credenciales

### Opción 1: Editar Archivo Manualmente (Recomendado)

1. **Detener FUXA:**
   ```bash
   cd /home/jsalazar-fcore/FUXA/server
   pkill -9 -f "node main.js"
   ```

2. **Editar el archivo:**
   ```bash
   nano /home/jsalazar-fcore/FUXA/_appdata/thingsboard-config.json
   ```

3. **Cambiar los valores:**
   ```json
   {
     "enabled": true,
     "host": "tu-servidor-thingsboard.com",
     "port": 443,
     "protocol": "https",
     "username": "tu-usuario@thingsboard.org",
     "password": "tu-contraseña-en-texto-plano"
   }
   ```

4. **Guardar y cerrar** (Ctrl+O, Enter, Ctrl+X)

5. **Reiniciar FUXA:**
   ```bash
   npm start
   ```

6. **Verificar:** La contraseña se encriptará automáticamente al iniciar.

### Opción 2: Usar API REST

```bash
curl -X POST http://localhost:1881/api/thingsboard/config \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FUXA_TOKEN" \
  -d '{
    "host": "nuevo-servidor.com",
    "port": 443,
    "protocol": "https",
    "username": "nuevo-usuario@thingsboard.org",
    "password": "nueva-contraseña"
  }'
```

⚠️ **Nota:** Requiere autenticación de FUXA.

### Opción 3: Eliminar y Recrear

1. **Eliminar archivo:**
   ```bash
   rm /home/jsalazar-fcore/FUXA/_appdata/thingsboard-config.json
   ```

2. **Reiniciar FUXA:** Se creará con valores por defecto

3. **Editar con nuevas credenciales**

---

## ✅ Verificar Configuración

### 1. Verificar que el archivo existe:

```bash
ls -la /home/jsalazar-fcore/FUXA/_appdata/thingsboard-config.json
```

### 2. Ver contenido (sin contraseña):

```bash
curl http://localhost:1881/api/thingsboard/config
```

Respuesta esperada:
```json
{
  "enabled": true,
  "host": "192.168.31.113",
  "port": 8081,
  "protocol": "http",
  "username": "tenant@thingsboard.org"
}
```

### 3. Verificar estado de conexión:

```bash
curl http://localhost:1881/api/thingsboard/status
```

Respuesta esperada:
```json
{
  "initialized": true,
  "enabled": true,
  "client": {
    "connected": true,
    "authenticated": true
  }
}
```

### 4. Probar conexión:

```bash
curl -X POST http://localhost:1881/api/thingsboard/test \
  -H "Content-Type: application/json" \
  -d '{
    "host": "192.168.31.113",
    "port": 8081,
    "protocol": "http",
    "username": "tenant@thingsboard.org",
    "password": "tenant"
  }'
```

Respuesta esperada:
```json
{
  "success": true,
  "message": "Connection successful",
  "connected": true
}
```

---

## 🔍 Troubleshooting

### Problema: "Authentication failed"

**Causa:** Credenciales incorrectas

**Solución:**
1. Verificar usuario y contraseña en ThingsBoard
2. Asegurarse de usar el usuario correcto (tenant, customer, etc.)
3. Verificar que la contraseña no tenga caracteres especiales sin escapar

### Problema: "Connection timeout"

**Causa:** No puede conectar con ThingsBoard

**Solución:**
1. Verificar que ThingsBoard esté corriendo
2. Verificar host y puerto
3. Verificar firewall/red
4. Probar con `curl`:
   ```bash
   curl http://192.168.31.113:8081/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"tenant@thingsboard.org","password":"tenant"}'
   ```

### Problema: "Invalid configuration"

**Causa:** Archivo JSON mal formado

**Solución:**
1. Validar JSON con:
   ```bash
   cat /home/jsalazar-fcore/FUXA/_appdata/thingsboard-config.json | jq .
   ```
2. Si hay error, corregir sintaxis JSON
3. Asegurarse de que no falten comas o llaves

### Problema: Contraseña no se encripta

**Causa:** Error en el proceso de encriptación

**Solución:**
1. Verificar logs:
   ```bash
   tail -f /home/jsalazar-fcore/FUXA/server/_logs/fuxa.log | grep thingsboard-config
   ```
2. Verificar que Node.js tenga módulo `crypto`
3. Reiniciar FUXA

---

## 📋 Checklist de Configuración

- [ ] Archivo `thingsboard-config.json` existe
- [ ] Parámetro `enabled` es `true`
- [ ] Host y puerto son correctos
- [ ] Protocolo es correcto (`http` o `https`)
- [ ] Usuario es válido
- [ ] Contraseña es correcta
- [ ] ThingsBoard está accesible desde FUXA
- [ ] Status API retorna `connected: true`
- [ ] Test API retorna `success: true`

---

## 🔒 Seguridad

### Buenas Prácticas:

1. **No compartir el archivo de configuración** - Contiene credenciales
2. **Usar HTTPS** en producción
3. **Cambiar la clave de encriptación** por defecto
4. **Usar usuarios con permisos mínimos** en ThingsBoard
5. **Rotar contraseñas** periódicamente
6. **Hacer backup** del archivo de configuración
7. **Restringir acceso** al directorio `_appdata`

### Permisos del Archivo:

```bash
chmod 600 /home/jsalazar-fcore/FUXA/_appdata/thingsboard-config.json
chown fuxa:fuxa /home/jsalazar-fcore/FUXA/_appdata/thingsboard-config.json
```

---

## 📚 Referencias

- **Código de Configuración:** `/server/runtime/thingsboard/tb-config.js`
- **API de Configuración:** `/server/api/thingsboard/index.js`
- **Documentación ThingsBoard:** https://thingsboard.io/docs/
