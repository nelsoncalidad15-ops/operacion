# Manual de Integración Google Apps Script y Google Sheets

Este sistema de **Control de Insumos** utiliza **Google Sheets** como base de datos y **Google Apps Script** como API backend liviana.

---

## 1. Estructura de las 4 Hojas en Google Sheets

Tu planilla de Google Sheets debe contener **únicamente** estas 4 hojas (la función `setupSistemaInsumos()` las crea y formatea automáticamente):

### 1.1 Hoja `INSUMOS` (Catálogo maestro)
- **A: ID** (ej: `INS-001`)
- **B: Categoría** (ej: `Limpieza`, `Seguridad`, `Librería`, `Mecánica`)
- **C: Insumo** (ej: `Shampoo vehículos`, `Resma A4`)
- **D: Unidad** (ej: `Litros`, `Unidad`, `Caja`, `Balde`)
- **E: Provincia** (ej: `Jujuy`, `Salta`)
- **F: Stock mínimo** (número)
- **G: Stock objetivo** (número)
- **H: Activo** (`Sí` o `No`)

### 1.2 Hoja `INGRESOS` (Historial de compras y entradas)
- **A: ID Movimiento** (ej: `ING-20260920-00001`)
- **B: Fecha/Hora** (`yyyy-MM-dd HH:mm:ss`)
- **C: Provincia** (`Jujuy` / `Salta`)
- **D: ID Insumo** (ej: `INS-001`)
- **E: Insumo** (ej: `Shampoo vehículos`)
- **F: Cantidad** (número ingresado)
- **G: Precio Unitario** (número en ARS)
- **H: Total** (`Cantidad × Precio Unitario`)
- **I: Proveedor** (Texto del proveedor)
- **J: Tipo Ingreso** (`Compra`, `Devolución`, `Ajuste`, `Stock inicial`)
- **K: Comprobante** (ej: `FAC-A-0001-00084321`)
- **L: Responsable** (Nombre del responsable autenticado por PIN)
- **M: Observaciones**

### 1.3 Hoja `SALIDAS` (Solicitudes y retiros autorizados)
- **A: ID Solicitud** (ej: `SAL-20260929-00001`)
- **B: Fecha/Hora Solicitud** (`yyyy-MM-dd HH:mm:ss`)
- **C: Provincia** (`Jujuy` / `Salta`)
- **D: Sector** (`Taller`, `Lavadero`, `Repuestos`, `Administración`, etc.)
- **E: ID Insumo** (`INS-001`)
- **F: Insumo** (`Shampoo vehículos`)
- **G: Solicitante** (Nombre del colaborador)
- **H: Cantidad Solicitada** (Número solicitado originalmente, nunca se sobrescribe)
- **I: Cantidad Autorizada** (Número efectivamente autorizado por el responsable)
- **J: Autorizado Por** (Nombre del responsable según PIN validado)
- **K: Fecha/Hora Autorización** (`yyyy-MM-dd HH:mm:ss`)
- **L: Costo Unitario** (Costo promedio ponderado vigente al momento de autorizar)
- **M: Valor Salida** (`Cantidad Autorizada × Costo Unitario`)
- **N: Estado** (`PENDIENTE`, `AUTORIZADO`, `AUTORIZADO PARCIAL`, `RECHAZADO`, `CANCELADO`)
- **O: Observaciones**
- **P: Motivo Rechazo** (Comentario de rechazo si aplica)

### 1.4 Hoja `STOCK` (Inventario calculado automáticamente)
- **A: ID Insumo**
- **B: Provincia**
- **C: Categoría**
- **D: Insumo**
- **E: Unidad**
- **F: Total Ingresado** (Suma de INGRESOS)
- **G: Total Salido** (Suma de Cantidad Autorizada de salidas con estado AUTORIZADO o AUTORIZADO PARCIAL)
- **H: Stock Actual** (`Total Ingresado - Total Salido`)
- **I: Costo Promedio** (Costo promedio ponderado = Total valor ingresado / Total unidades ingresadas)
- **J: Valor Stock** (`Stock Actual × Costo Promedio`)
- **K: Stock Mínimo**
- **L: Stock Objetivo**
- **M: Cantidad a Reponer** (Si `Stock Actual <= Stock Mínimo`: `Stock Objetivo - Stock Actual`; sino `0`)
- **N: Estado** (`SUFICIENTE`, `CERCA DEL MÍNIMO`, `CRÍTICO / BAJO MÍNIMO`)

---

## 2. Pasos para Implementar en Google Sheets

1. Crea una nueva planilla en Google Drive o abre tu planilla existente.
2. Ve al menú **Extensiones** → **Apps Script**.
3. En el editor de Apps Script, crea los siguientes archivos `.gs` copiando el contenido de la carpeta `/apps-script/`:
   - `Config.gs`
   - `Utils.gs`
   - `Setup.gs`
   - `Auth.gs`
   - `Stock.gs`
   - `Solicitudes.gs`
   - `Ingresos.gs`
   - `Api.gs`
4. En el selector de funciones, elige `setupSistemaInsumos` y haz clic en **Ejecutar**.
   - Concede los permisos de lectura y escritura en la hoja de cálculo.
   - La función creará automáticamente las 4 hojas con sus encabezados en negrita, colores corporativos, fila 1 congelada y formato numérico.

---

## 3. Configuración de Script Properties (Seguridad y PINs)

Para no exponer tu ID de planilla ni los PINs en el código:

1. En Apps Script, ve a **Configuración del proyecto** (ícono de engranaje a la izquierda).
2. Baja hasta **Propiedades de la secuencia de comandos** (Script Properties).
3. Agrega las siguientes propiedades:
   - `SPREADSHEET_ID`: El ID de tu hoja de Google Sheets (la parte entre `/d/` y `/edit` de la URL de tu planilla). *Nota: Si el script está vinculado directamente a la planilla (Extensiones > Apps Script), esto es opcional porque detecta la hoja activa.*
   - `RESPONSABLES_JSON`: Diccionario en formato JSON de PINs a Nombres. Ejemplo:
     ```json
     {"1423":"Marcelo Pereyra","7852":"Pablo Guantay","9021":"Nelson Albarracín"}
     ```

---

## 4. Despliegue como Web App

1. En Apps Script, haz clic en el botón azul **Implementar** (Deploy) → **Nueva implementación** (New deployment).
2. Selecciona tipo: **Aplicación web** (Web app).
3. Configura:
   - **Descripción**: `Control de Insumos API v1`
   - **Ejecutar como**: `Yo` (tu cuenta de Google)
   - **Quién tiene acceso**: `Cualquier persona` (Anyone). *Esto permite que el frontend web pueda comunicarse mediante fetch sin requerir login de Google en los celulares de los operarios.*
4. Haz clic en **Implementar**.
5. Copia la **URL de la aplicación web** generada (termina en `/exec`).

---

## 5. Conexión con el Frontend Web

1. Abre la aplicación web en tu navegador.
2. En la barra superior, haz clic en **Conexión & Apps Script** (o el botón de estado de conexión).
3. Pega la URL de tu Web App de Google Apps Script.
4. Presiona **Probar y Guardar Conexión**.
5. El sistema verificará el `ping` con tu Google Sheets y quedará conectado en tiempo real.
