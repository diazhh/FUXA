# White Label - Elementos de Marca FUXA

Este documento lista todos los elementos visibles al usuario que contienen referencias a la marca FUXA, FrangoTeam u otros elementos de branding que deben ser modificados para white-labeling.

## Estado: ✅ COMPLETADO - Cambiado a GDT-SCADA

**Fecha de actualización:** Cambios aplicados
**Marca anterior:** FUXA / FrangoTeam
**Nueva marca:** GDT-SCADA / GDT

---

## 1. ARCHIVOS HTML - Textos Visibles

### 1.1 `/client/src/index.html`
**Línea 6:** Título de la página
```html
<title>FUXA</title>
```
- ✅ **Acción:** Cambiar "FUXA" por el nombre de la marca personalizada
- 📍 **Visible en:** Pestaña del navegador

**Línea 44:** Mensaje de carga
```html
<div style="display:block;font-size: 18px; font-weight: 600; text-align: center;">FUXA Loading...</div>
```
- ✅ **Acción:** Cambiar "FUXA Loading..." por mensaje personalizado
- 📍 **Visible en:** Pantalla de carga inicial

**Líneas 45-47:** Powered by
```html
<div style="display: block;font-size: 10px;padding-top: 3px; text-align: center;">
    powered by <span><b>frango</b>team</span>
</div>
```
- ✅ **Acción:** Eliminar o reemplazar con marca personalizada
- 📍 **Visible en:** Pantalla de carga inicial

---

### 1.2 `/client/src/app/home/userinfo.dialog.html`
**Línea 15:** Footer del diálogo de usuario
```html
FUXA powered by <span><b>frango</b>team</span>
```
- ✅ **Acción:** Eliminar o reemplazar con marca personalizada
- 📍 **Visible en:** Diálogo de información de usuario (al hacer clic en el usuario)

---

### 1.3 `/client/src/app/header/info.dialog.html`
**Línea 4:** Título del diálogo "About"
```html
<div style="font-size: 18px;display: inline-block;vertical-align: super;padding-left: 5px;">{{'dlg.info-title' | translate}}</div>
```
- ✅ **Acción:** La traducción 'dlg.info-title' contiene "FUXA" (ver sección de traducciones)
- 📍 **Visible en:** Diálogo "About" / "Acerca de"

**Línea 11:** Powered by en diálogo About
```html
powered by <span><b>frango</b>team</span>
```
- ✅ **Acción:** Eliminar o reemplazar con marca personalizada
- 📍 **Visible en:** Diálogo "About" / "Acerca de"

---

## 2. ARCHIVOS DE TRADUCCIÓN (i18n)

Todos los archivos en `/client/src/assets/i18n/` contienen referencias a "FUXA" que son visibles al usuario:

### 2.1 Claves de traducción con "FUXA" (en TODOS los idiomas)

**Idiomas afectados:** `de.json`, `en.json`, `es.json`, `fr.json`, `ko.json`, `pt.json`, `ru.json`, `sv.json`, `tr.json`, `ua.json`, `zh-cn.json`

#### Traducciones a modificar:

1. **`header.help`** - "FUXA Help" / "FUXA ayuda" / etc.
   - 📍 **Visible en:** Menú de ayuda

2. **`sidenav.title`** - "FUXA"
   - 📍 **Visible en:** Título del menú lateral

3. **`tutorial.title`** - "FUXA Tutorial"
   - 📍 **Visible en:** Título del tutorial

4. **`dlg.info-title`** - "FUXA"
   - 📍 **Visible en:** Diálogo "About"

5. **`device.property-server`** - "FUXA Server Property" / "Propiedades servidor FUXA" / etc.
   - 📍 **Visible en:** Configuración de dispositivos

### 2.2 Archivos específicos por idioma

- ✅ `/client/src/assets/i18n/en.json` - Líneas 23, 32, 34, 36, 896
- ✅ `/client/src/assets/i18n/es.json` - Líneas 21, 27, 29, 31, 462
- ✅ `/client/src/assets/i18n/de.json` - Líneas similares
- ✅ `/client/src/assets/i18n/fr.json` - Línea 876
- ✅ `/client/src/assets/i18n/ko.json` - Líneas 21, 27, 29, 31, 462
- ✅ `/client/src/assets/i18n/pt.json` - Líneas 21, 26, 28, 30, 421
- ✅ `/client/src/assets/i18n/ru.json` - Líneas 31, 33, 35, 688
- ✅ `/client/src/assets/i18n/sv.json` - Líneas 23, 32, 34, 36
- ✅ `/client/src/assets/i18n/tr.json` - Líneas 22, 27, 29, 31, 416
- ✅ `/client/src/assets/i18n/ua.json` - Líneas 17, 22, 24, 26, 391
- ✅ `/client/src/assets/i18n/zh-cn.json` - Líneas 23, 32, 34, 36, 878

---

## 3. ARCHIVOS CSS/SCSS

### 3.1 `/client/src/styles.css`
**Líneas 289-296:** Clase del logo
```css
.logo {
    display: block;
    text-indent: -9999px;
    width: 30px;
    height: 30px;
    background: url(assets/images/logo.svg);
    background-size: 30px 30px;
}
```
- ✅ **Acción:** La referencia al archivo `logo.svg` debe apuntar al nuevo logo
- 📍 **Visible en:** Múltiples lugares (header, diálogos, etc.)

---

## 4. IMÁGENES Y RECURSOS

### 4.1 Logo principal
- **Archivo:** `/client/src/assets/images/logo.svg`
- ✅ **Acción:** Reemplazar con el logo personalizado (mantener el mismo nombre o actualizar referencias en CSS)
- 📍 **Visible en:** Toda la aplicación (header, diálogos, pantalla de carga)

### 4.2 Favicon
- **Archivo:** `/client/src/favicon.ico`
- ✅ **Acción:** Reemplazar con el favicon personalizado
- 📍 **Visible en:** Pestaña del navegador

---

## 5. ARCHIVOS TYPESCRIPT (TypeScript)

### 5.1 `/client/src/app/app.component.ts`
**Línea 46:** Console log con versión
```typescript
console.log(`FUXA v${environment.version}`);
```
- ⚠️ **Acción:** OPCIONAL - Solo visible en consola del navegador (F12), no al usuario final
- 📍 **Visible en:** Consola de desarrollador

---

### 5.2 `/client/src/app/reports/report-editor/report-editor.component.ts`
**Línea 141:** Header de PDFs generados
```typescript
docDefinition['header'] = { text: 'FUXA by frangoteam', style:[{fontSize: 6}]};
```
- ✅ **Acción:** Cambiar texto del header en reportes PDF
- 📍 **Visible en:** Reportes PDF exportados

---

### 5.3 `/client/src/app/resources/kiosk-widgets/kiosk-widgets.service.ts`
**Líneas 12-14:** URLs de recursos externos
```typescript
endPointWidgetResources = 'https://frangoteam.org/api/list-widgets.php';
resourceWidgets$: Observable<WidgetsResource[]>;
widgetAssetBaseUrl = 'https://frangoteam.org/widgets/';
```
- ⚠️ **Acción:** EVALUAR - URLs de widgets externos. Si se usan widgets, considerar alojarlos en servidor propio
- 📍 **Visible en:** Funcionalidad de widgets (si se usa)

---

## 6. ARCHIVOS DE CONFIGURACIÓN

### 6.1 `/client/package.json`
**Líneas 2-10:** Metadatos del paquete
```json
"name": "fuxa",
"version": "1.2.7-2525",
"author": "frangoteam <info@frangoteam.org>",
"description": "Web-based Process Visualization (SCADA/HMI/Dashboard) software",
"repository": {
  "type": "git",
  "url": "https://github.com/frangoteam/FUXA.git"
}
```
- ⚠️ **Acción:** OPCIONAL - No visible al usuario final, pero recomendado cambiar para consistencia
- 📍 **Visible en:** Solo en código fuente

---

### 6.2 `/client/angular.json`
**Línea 6:** Nombre del proyecto Angular
```json
"FUXA": {
```
- ⚠️ **Acción:** OPCIONAL - No visible al usuario final
- 📍 **Visible en:** Solo en configuración de desarrollo

---

## 7. ELEMENTOS NO VISIBLES AL USUARIO (Código interno)

Los siguientes elementos NO son visibles al usuario final y NO requieren cambios para white-labeling:

### 7.1 LocalStorage keys (solo código interno)
- `@frango.webeditor.currentview`
- `@frango.webeditor.panelsState`
- `@frango.devicesview`

Estos son identificadores internos en localStorage y no se muestran al usuario.

---

## RESUMEN DE PRIORIDADES

### 🔴 PRIORIDAD ALTA (Visible directamente al usuario)
1. ✅ Título de página HTML (`index.html` línea 6)
2. ✅ Mensaje de carga (`index.html` línea 44)
3. ✅ "Powered by" en pantalla de carga (`index.html` líneas 45-47)
4. ✅ Logo SVG (`/client/src/assets/images/logo.svg`)
5. ✅ Favicon (`/client/src/favicon.ico`)
6. ✅ Todas las traducciones i18n (11 archivos de idiomas)
7. ✅ Diálogo de usuario (`userinfo.dialog.html` línea 15)
8. ✅ Diálogo About (`info.dialog.html` líneas 4 y 11)
9. ✅ Header de PDFs (`report-editor.component.ts` línea 141)

### 🟡 PRIORIDAD MEDIA (Visible en circunstancias específicas)
10. ✅ URLs de widgets externos (`kiosk-widgets.service.ts`)

### 🟢 PRIORIDAD BAJA (Opcional, no visible al usuario)
11. ⚠️ Console.log (`app.component.ts` línea 46)
12. ⚠️ package.json metadata
13. ⚠️ angular.json project name
14. ⚠️ LocalStorage keys

---

## CHECKLIST DE IMPLEMENTACIÓN

- [ ] Reemplazar logo.svg (PENDIENTE - Requiere archivo de imagen)
- [ ] Reemplazar favicon.ico (PENDIENTE - Requiere archivo de imagen)
- [x] Modificar index.html (título y textos de carga) ✅
- [x] Modificar userinfo.dialog.html ✅
- [x] Modificar info.dialog.html ✅
- [x] Actualizar 11 archivos de traducción (i18n) ✅
- [x] Modificar header de PDFs en report-editor.component.ts ✅
- [ ] Evaluar URLs de widgets externos (PENDIENTE - Requiere decisión)
- [x] (Opcional) Actualizar console.log ✅
- [ ] (Opcional) Actualizar package.json
- [ ] Probar en todos los idiomas disponibles

---

## NOTAS ADICIONALES

- **Total de archivos a modificar (obligatorios):** ~16 archivos
- **Idiomas soportados:** 11 (alemán, inglés, español, francés, coreano, portugués, ruso, sueco, turco, ucraniano, chino)
- **Elementos visuales:** 2 (logo.svg, favicon.ico)

---

## RESUMEN DE CAMBIOS APLICADOS

### ✅ Archivos Modificados (17 archivos)

#### HTML (3 archivos)
1. `/client/src/index.html` - Título, mensaje de carga y "powered by"
2. `/client/src/app/home/userinfo.dialog.html` - Footer del diálogo de usuario
3. `/client/src/app/header/info.dialog.html` - Diálogo "About"

#### Archivos de Traducción i18n (11 archivos)
4. `/client/src/assets/i18n/en.json` - Inglés
5. `/client/src/assets/i18n/es.json` - Español
6. `/client/src/assets/i18n/de.json` - Alemán
7. `/client/src/assets/i18n/fr.json` - Francés
8. `/client/src/assets/i18n/ko.json` - Coreano
9. `/client/src/assets/i18n/pt.json` - Portugués
10. `/client/src/assets/i18n/ru.json` - Ruso
11. `/client/src/assets/i18n/sv.json` - Sueco
12. `/client/src/assets/i18n/tr.json` - Turco
13. `/client/src/assets/i18n/ua.json` - Ucraniano
14. `/client/src/assets/i18n/zh-cn.json` - Chino (+ corrección de clave duplicada)

#### TypeScript (3 archivos)
15. `/client/src/app/reports/report-editor/report-editor.component.ts` - Header de PDFs
16. `/client/src/app/app.component.ts` - Console.log
17. `/client/src/app/_services/settings.service.ts` - Idioma por defecto (en → es)

### 📝 Cambios Realizados

**Reemplazos de texto:**
- `FUXA` → `GDT-SCADA` (en todos los textos visibles)
- `frangoteam` / `frango` → `GDT` (en todos los "powered by")

**Traducciones actualizadas (5 claves por idioma):**
- `header.help`: "FUXA Help" → "GDT-SCADA Help"
- `sidenav.title`: "FUXA" → "GDT-SCADA"
- `tutorial.title`: "FUXA Tutorial" → "GDT-SCADA Tutorial"
- `dlg.info-title`: "FUXA" → "GDT-SCADA"
- `device.property-server`: "FUXA Server Property" → "GDT-SCADA Server Property"

### ⚠️ Pendientes (Requieren acción adicional)

1. **Logo SVG** (`/client/src/assets/images/logo.svg`) - Reemplazar con logo de GDT
2. **Favicon** (`/client/src/favicon.ico`) - Reemplazar con favicon de GDT
3. **URLs de widgets externos** (`kiosk-widgets.service.ts`) - Evaluar si se necesitan widgets

### 🌐 Configuración de Idioma

**Idioma por defecto cambiado a ESPAÑOL**
- Archivo modificado: `/client/src/app/_services/settings.service.ts`
- Cambio: `setDefaultLang('en')` → `setDefaultLang('es')`
- Cambio: `use('en')` → `use('es')`
- ✅ La aplicación ahora inicia en español por defecto

### 🔍 Próximos Pasos Recomendados

1. Proporcionar el logo de GDT en formato SVG (30x30px y 60x60px)
2. Proporcionar el favicon de GDT en formato .ico
3. Compilar y probar la aplicación: `npm run build`
4. Verificar visualmente en todos los idiomas disponibles
5. Probar generación de reportes PDF para verificar el header
6. Verificar que el idioma español se carga correctamente al iniciar

**Última actualización:** Cambios de marca aplicados - FUXA → GDT-SCADA + Idioma español por defecto
