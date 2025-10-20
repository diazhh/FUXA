# Reglas del Proyecto FUXA

## Restricciones de Código

### Prohibiciones Estrictas
- **NO** se permiten datos de prueba (test data)
- **NO** se permiten datos mock o simulados
- **NO** se permite código hardcodeado (valores fijos en el código)
- Todas las configuraciones deben ser dinámicas y obtenerse de fuentes reales

## Arquitectura de Integración ThingsBoard

### Principio Fundamental
FUXA debe conectarse directamente a ThingsBoard como fuente única de verdad para devices y tags.

### Requisitos de Implementación
1. **Conexión Directa**: Usar credenciales reales para conectar con ThingsBoard
2. **Sincronización Transparente**: Los cambios en ThingsBoard deben reflejarse inmediatamente en FUXA
3. **Sin Base de Datos Local**: No almacenar información de tags ni devices en la base de datos de FUXA
4. **Telemetría como Tags**: La telemetría de los devices en ThingsBoard son los tags disponibles en FUXA
5. **Tiempo Real**: Cuando se agregue un device en ThingsBoard, debe aparecer automáticamente en FUXA

### Implicaciones
- Eliminar dependencia del sistema de drivers custom para ThingsBoard
- Eliminar almacenamiento local de tags y devices
- Implementar sincronización en tiempo real con ThingsBoard API
