# Integración ThingsBoard - FUXA

## 📚 Documentación

Esta carpeta contiene la documentación completa de la integración entre FUXA y ThingsBoard.

### Documentos Disponibles:

1. **[01-ARQUITECTURA.md](./01-ARQUITECTURA.md)** - Arquitectura y funcionamiento de la integración
2. **[02-CONFIGURACION.md](./02-CONFIGURACION.md)** - Configuración de credenciales y parámetros
3. **[03-ALMACENAMIENTO.md](./03-ALMACENAMIENTO.md)** - Qué se guarda y qué no en FUXA
4. **[04-FLUJO-DATOS.md](./04-FLUJO-DATOS.md)** - Flujo de datos en tiempo real
5. **[05-API-ENDPOINTS.md](./05-API-ENDPOINTS.md)** - Endpoints REST disponibles
6. **[06-CUMPLIMIENTO.md](./06-CUMPLIMIENTO.md)** - Cumplimiento de requerimientos iniciales

---

## 🎯 Resumen Ejecutivo

### Principio Fundamental

**FUXA se conecta directamente a ThingsBoard como fuente única de verdad.**

- ❌ **NO** almacena devices de ThingsBoard en su base de datos
- ❌ **NO** almacena tags de ThingsBoard localmente
- ❌ **NO** sincroniza datos periódicamente
- ✅ **SÍ** consulta ThingsBoard en tiempo real (on-demand)
- ✅ **SÍ** usa polling de 1 segundo para valores en Lab/Home
- ✅ **SÍ** mantiene credenciales encriptadas en archivo de configuración

### Formato de Tags ThingsBoard

Los tags de ThingsBoard usan el formato:

```
tb:{deviceId}:{telemetryKey}
```

**Ejemplo:**
```
tb:622b4ba0-a850-11f0-aabd-5b2d2a47a78c:temperatura
```

Donde:
- `tb` = Prefijo identificador de ThingsBoard
- `622b4ba0-a850-11f0-aabd-5b2d2a47a78c` = ID del device en ThingsBoard
- `temperatura` = Clave de telemetría del device

---

## 🚀 Inicio Rápido

### 1. Configurar Credenciales

Editar el archivo: `/home/jsalazar-fcore/FUXA/_appdata/thingsboard-config.json`

```json
{
  "enabled": true,
  "host": "192.168.31.113",
  "port": 8081,
  "protocol": "http",
  "username": "tenant@thingsboard.org",
  "password": "encrypted_password_here"
}
```

### 2. Verificar Conexión

```bash
curl http://localhost:1881/api/thingsboard/status
```

### 3. Listar Devices

```bash
curl http://localhost:1881/api/thingsboard/devices
```

---

## 📖 Lectura Recomendada

Si es tu primera vez con esta integración, lee los documentos en orden:

1. Empieza con **ARQUITECTURA** para entender cómo funciona
2. Luego **CONFIGURACION** para saber dónde cambiar credenciales
3. Después **ALMACENAMIENTO** para entender qué se guarda
4. Finalmente **CUMPLIMIENTO** para verificar que cumple los requerimientos

---

## 🔧 Soporte

Para más información sobre cada componente, consulta los documentos específicos en esta carpeta.
