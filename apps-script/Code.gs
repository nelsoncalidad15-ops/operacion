// ============================================================================
// Config.gs
// ============================================================================

/**
 * Control de Insumos - Configuración General
 * Apps Script Backend
 */

var CONFIG = {
  // Nombres de las hojas del sistema
  HOJAS: {
    INSUMOS: 'INSUMOS',
    COLABORADORES: 'COLABORADORES',
    INGRESOS: 'INGRESOS',
    SALIDAS: 'SALIDAS',
    STOCK: 'STOCK'
  },

  // Zona horaria de la empresa
  TIMEZONE: 'America/Argentina/Jujuy',

  // Provincias habilitadas
  PROVINCIAS: ['Jujuy', 'Salta'],

  // Sectores de la empresa
  SECTORES: ['Taller', 'Lavadero'],

  // Lista base de Colaboradores
  COLABORADORES: [
    { nombre: 'Mauro Gutiérrez', sector: 'Taller', provincia: 'Jujuy' },
    { nombre: 'Carlos Quispe', sector: 'Taller', provincia: 'Jujuy' },
    { nombre: 'Esteban Martínez', sector: 'Lavadero', provincia: 'Jujuy' },
    { nombre: 'Franco Alarcón', sector: 'Lavadero', provincia: 'Jujuy' },
    { nombre: 'Gustavo Benítez', sector: 'Taller', provincia: 'Salta' },
    { nombre: 'Matías Villalba', sector: 'Lavadero', provincia: 'Salta' }
  ],

  // Duración de la sesión de responsable (en segundos) para CacheService
  DURACION_SESION_SEG: 1800, // 30 minutos

  // PINs por defecto (se recomienda configurar en Script Properties)
  // Formato: PIN -> Nombre del Responsable
  PINS_POR_DEFECTO: {
    '1423': 'Marcelo Pereyra',
    '7852': 'Pablo Guantay',
    '9021': 'Nelson Albarracín'
  }
};

/**
 * Obtiene la hoja de cálculo activa o la vinculada por ID en Script Properties
 */
function getSpreadsheet() {
  var prop = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (prop && prop.trim() !== '') {
    return SpreadsheetApp.openById(prop.trim());
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Obtiene el mapa de responsables y sus PINs
 */
function getResponsablesMap() {
  try {
    var raw = PropertiesService.getScriptProperties().getProperty('RESPONSABLES_JSON');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error leyendo RESPONSABLES_JSON de Script Properties: ' + e.message);
  }
  return CONFIG.PINS_POR_DEFECTO;
}

// ============================================================================
// Utils.gs
// ============================================================================

/**
 * Control de Insumos - Funciones de Utilidad
 */

/**
 * Formatea una fecha u objeto Date a string en la zona horaria de Jujuy
 * Formato: yyyy-MM-dd HH:mm:ss
 */
function getFechaHoraActual() {
  return Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');
}

/**
 * Obtiene la fecha en formato YYYYMMDD para generación de IDs
 */
function getFechaCompacta() {
  return Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyyMMdd');
}

/**
 * Genera un ID único para un movimiento o solicitud
 * @param {string} prefijo - 'ING' o 'SAL' o 'INS'
 * @param {Sheet} hoja - La hoja donde se buscará el consecutivo
 */
function generarIdUnico(prefijo, hoja) {
  var fecha = getFechaCompacta();
  var pattern = prefijo + '-' + fecha + '-';
  var lastRow = hoja.getLastRow();
  var maxSeq = 0;

  if (lastRow > 1) {
    var ids = hoja.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      var val = String(ids[i][0]);
      if (val.indexOf(pattern) === 0) {
        var num = parseInt(val.substring(pattern.length), 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
  }

  var seq = ('00000' + (maxSeq + 1)).slice(-5);
  return prefijo + '-' + fecha + '-' + seq;
}

/**
 * Genera un ID para un nuevo insumo del maestro (INS-001, INS-002, etc.)
 */
function generarIdInsumo(hojaInsumos) {
  var lastRow = hojaInsumos.getLastRow();
  var count = 1;
  if (lastRow > 1) {
    var ids = hojaInsumos.getRange(2, 1, lastRow - 1, 1).getValues();
    count = ids.length + 1;
  }
  return 'INS-' + ('000' + count).slice(-3);
}

/**
 * Sanitiza y convierte a número de forma segura
 */
function parseNumeroSeguro(val) {
  if (val === null || val === undefined || val === '') return 0;
  var num = Number(val);
  return isNaN(num) ? 0 : num;
}

/**
 * Crea una respuesta estándar JSON para la Web App
 */
function crearRespuesta(ok, data, message, code, details) {
  return {
    ok: ok,
    data: data || null,
    message: message || (ok ? 'Operación exitosa' : 'Error en la operación'),
    code: code || (ok ? 'SUCCESS' : 'ERROR'),
    details: details || null
  };
}

// ============================================================================
// Setup.gs
// ============================================================================

/**
 * Control de Insumos - Instalación Inicial y Estructura de Hojas
 * Función setupSistemaInsumos()
 */

function setupSistemaInsumos() {
  var ss = getSpreadsheet();

  // Definición exacta de las columnas requeridas
  var estructuras = {
    INSUMOS: {
      nombre: CONFIG.HOJAS.INSUMOS,
      columnas: [
        'ID',
        'Categoría',
        'Insumo',
        'Unidad',
        'Provincia',
        'Stock mínimo',
        'Stock objetivo',
        'Activo'
      ],
      ejemplos: [
        ['INS-001', 'Limpieza', 'Shampoo vehículos', 'Litros', 'Jujuy', 10, 30, 'Sí'],
        ['INS-002', 'Librería', 'Resma A4', 'Unidad', 'Jujuy', 5, 15, 'Sí'],
        ['INS-003', 'Seguridad', 'Guantes nitrilo (Caja x100)', 'Caja', 'Jujuy', 8, 25, 'Sí'],
        ['INS-004', 'Mecánica', 'Grasa para chasis (Balde 18kg)', 'Balde', 'Jujuy', 3, 8, 'Sí'],
        ['INS-005', 'Limpieza', 'Desengrasante motor', 'Litros', 'Jujuy', 15, 40, 'Sí'],
        ['INS-006', 'Mecánica', 'Líquido de frenos DOT 4 (500ml)', 'Unidad', 'Jujuy', 12, 30, 'Sí'],
        ['INS-007', 'Limpieza', 'Shampoo vehículos', 'Litros', 'Salta', 8, 25, 'Sí'],
        ['INS-008', 'Seguridad', 'Guantes nitrilo (Caja x100)', 'Caja', 'Salta', 6, 20, 'Sí']
      ]
    },
    COLABORADORES: {
      nombre: CONFIG.HOJAS.COLABORADORES,
      columnas: ['Nombre', 'Sector', 'Provincia', 'Activo'],
      ejemplos: CONFIG.COLABORADORES.map(function(colaborador) {
        return [colaborador.nombre, colaborador.sector, colaborador.provincia, 'Sí'];
      })
    },
    INGRESOS: {
      nombre: CONFIG.HOJAS.INGRESOS,
      columnas: [
        'ID Movimiento',
        'Fecha/Hora',
        'Provincia',
        'ID Insumo',
        'Insumo',
        'Cantidad',
        'Precio Unitario',
        'Total',
        'Proveedor',
        'Tipo Ingreso',
        'Comprobante',
        'Responsable',
        'Observaciones'
      ],
      ejemplos: []
    },
    SALIDAS: {
      nombre: CONFIG.HOJAS.SALIDAS,
      columnas: [
        'ID Solicitud',
        'Fecha/Hora Solicitud',
        'Provincia',
        'Sector',
        'ID Insumo',
        'Insumo',
        'Solicitante',
        'Cantidad Solicitada',
        'Cantidad Autorizada',
        'Autorizado Por',
        'Fecha/Hora Autorización',
        'Costo Unitario',
        'Valor Salida',
        'Estado',
        'Observaciones',
        'Motivo Rechazo'
      ],
      ejemplos: []
    },
    STOCK: {
      nombre: CONFIG.HOJAS.STOCK,
      columnas: [
        'ID Insumo',
        'Provincia',
        'Categoría',
        'Insumo',
        'Unidad',
        'Total Ingresado',
        'Total Salido',
        'Stock Actual',
        'Costo Promedio',
        'Valor Stock',
        'Stock Mínimo',
        'Stock Objetivo',
        'Cantidad a Reponer',
        'Estado'
      ],
      ejemplos: []
    }
  };

  for (var key in estructuras) {
    var def = estructuras[key];
    var hoja = ss.getSheetByName(def.nombre);

    if (!hoja) {
      hoja = ss.insertSheet(def.nombre);
    }

    // Verificar si ya tiene encabezados
    var lastRow = hoja.getLastRow();
    var lastCol = hoja.getLastColumn();

    if (lastRow === 0 || lastCol === 0) {
      // Hoja vacía: insertar encabezados
      hoja.getRange(1, 1, 1, def.columnas.length).setValues([def.columnas]);
      if (def.ejemplos.length > 0) {
        hoja.getRange(2, 1, def.ejemplos.length, def.columnas.length).setValues(def.ejemplos);
      }
    } else {
      // Verificar encabezados existentes sin borrar datos
      var currentHeaders = hoja.getRange(1, 1, 1, Math.min(lastCol, def.columnas.length)).getValues()[0];
      var needsHeaderFix = false;
      for (var c = 0; c < def.columnas.length; c++) {
        if (currentHeaders[c] !== def.columnas[c]) {
          needsHeaderFix = true;
          break;
        }
      }
      if (needsHeaderFix) {
        hoja.getRange(1, 1, 1, def.columnas.length).setValues([def.columnas]);
      }
    }

    // Formato visual sobrio y profesional
    var headerRange = hoja.getRange(1, 1, 1, def.columnas.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#f1f5f9'); // Gris suave Slate 100
    headerRange.setFontColor('#0f172a'); // Slate 900
    hoja.setFrozenRows(1);

    // Ajustar columnas
    for (var col = 1; col <= def.columnas.length; col++) {
      hoja.autoResizeColumn(col);
    }
  }

  // Recalcular la hoja de Stock automáticamente
  recalcularStockCompleto();

  // Corrige textos creados por versiones anteriores con codificación incorrecta.
  repararCodificacion();

  Logger.log('Sistema de Control de Insumos inicializado correctamente.');
  return 'Configuración inicial completada con éxito. Las 4 hojas están operativas.';
}

/**
 * Repara textos como "SÃ­" o "CategorÃ­a" que hayan quedado guardados
 * por una versión anterior del instalador.
 */
function repararCodificacion() {
  var ss = getSpreadsheet();
  var reemplazos = {
    'Ã¡': 'á', 'Ã©': 'é', 'Ã­': 'í', 'Ã³': 'ó', 'Ãº': 'ú', 'Ã±': 'ñ',
    'Ã': 'Á', 'Ã‰': 'É', 'Ã': 'Í', 'Ã“': 'Ó', 'Ãš': 'Ú', 'Ã‘': 'Ñ',
    'Â¿': '¿', 'Â¡': '¡', 'Â·': '·', 'â†’': '→', 'â€¢': '•'
  };

  ss.getSheets().forEach(function(hoja) {
    var rango = hoja.getDataRange();
    var valores = rango.getValues();
    var cambio = false;

    for (var fila = 0; fila < valores.length; fila++) {
      for (var columna = 0; columna < valores[fila].length; columna++) {
        if (typeof valores[fila][columna] !== 'string') continue;
        var texto = valores[fila][columna];
        Object.keys(reemplazos).forEach(function(mal) {
          texto = texto.split(mal).join(reemplazos[mal]);
        });
        if (texto !== valores[fila][columna]) {
          valores[fila][columna] = texto;
          cambio = true;
        }
      }
    }

    if (cambio) rango.setValues(valores);
  });

  return 'Textos corregidos correctamente.';
}

/**
 * Agrega el inventario real entregado por Autosol sin borrar información previa.
 * Es idempotente: puede ejecutarse nuevamente sin duplicar insumos ni stock inicial.
 */
function cargarDatosInicialesAutosol() {
  var ss = getSpreadsheet();
  var hojaInsumos = ss.getSheetByName(CONFIG.HOJAS.INSUMOS);
  var hojaIngresos = ss.getSheetByName(CONFIG.HOJAS.INGRESOS);
  var hojaColaboradores = ss.getSheetByName(CONFIG.HOJAS.COLABORADORES);

  if (!hojaInsumos || !hojaIngresos || !hojaColaboradores) {
    throw new Error('Primero ejecutá setupSistemaInsumos para crear las hojas.');
  }

  // nombre, cantidad inicial, unidad, valor total del lote, stock mínimo, sector/categoría
  var catalogo = [
    ['Rollo papel industrial', 2, 'Unidades', 30223, 3, 'Taller'],
    ['Bolsas negras', 50, 'Unidades', 15365, 10, 'Taller'],
    ['Bolsas amarillas', 70, 'Unidades', 21511, 10, 'Taller'],
    ['Plomo adhesivo', 100, 'Unidades', 87933, 20, 'Taller'],
    ['Gas R134a', 8000, 'Gramos', 196025, 2000, 'Taller'],
    ['Aceite R134a', 800, 'ml', 17765, 200, 'Taller'],
    ['Rost Off', 6, 'Unidades', 61885, 3, 'Taller'],
    ['Carboff', 2, 'Unidades', 40828, 1, 'Taller'],
    ['Grasa líquida', 3, 'Unidades', 30942, 3, 'Taller'],
    ['Limpia contactos', 17, 'Unidades', 212007, 3, 'Taller'],
    ['Desinfectante A/A', 6, 'Unidades', 74826, 2, 'Taller'],
    ['Limpiador de frenos', 5, 'Unidades', 62500, 1, 'Taller'],
    ['Gotita', 1, 'Unidades', 10714, 1, 'Taller'],
    ['Sellador parabrisas', 0, 'Unidades', 0, 4, 'Taller'],
    ['Sellador alta temperatura', 0, 'Unidades', 0, 1, 'Taller'],
    ['Cinta de enmascarar', 8, 'Unidades', 25516, 3, 'Taller'],
    ['Precintos', 120, 'Unidades', 12895, 10, 'Taller'],
    ['Guantes moteados', 11, 'Pares', 10648, 5, 'Taller'],
    ['Guantes de nitrilo', 6, 'Pares', 12974, 3, 'Taller'],
    ['Gafas', 1, 'Unidades', 2250, 1, 'Taller'],
    ['Shampoo', 10000, 'ml', 64000, 3000, 'Lavadero'],
    ['Caucho', 13700, 'ml', 278494, 3000, 'Lavadero'],
    ['Desengrasante', 30000, 'ml', 435600, 3000, 'Lavadero'],
    ['Rejilla microfibra', 0, 'Unidades', 0, 1, 'Lavadero'],
    ['Rejilla 2 hilos', 1, 'Unidades', 8200, 1, 'Lavadero'],
    ['Esponja', 0, 'Unidades', 0, 1, 'Lavadero'],
    ['Cepillo Cercrin', 0, 'Unidades', 0, 1, 'Lavadero'],
    ['Atomizador', 0, 'Unidades', 0, 1, 'Lavadero']
  ];

  var existentes = hojaInsumos.getDataRange().getValues();
  var porNombre = {};
  for (var i = 1; i < existentes.length; i++) {
    porNombre[String(existentes[i][2]).trim().toLowerCase() + '_jujuy'] = String(existentes[i][0]).trim();
  }

  var ingresosExistentes = hojaIngresos.getDataRange().getValues();
  var cargasIniciales = {};
  for (var e = 1; e < ingresosExistentes.length; e++) {
    if (String(ingresosExistentes[e][10]).trim() === 'CARGA-INICIAL-AUTOSOL') {
      cargasIniciales[String(ingresosExistentes[e][3]).trim()] = true;
    }
  }

  for (var c = 0; c < catalogo.length; c++) {
    var item = catalogo[c];
    var clave = item[0].toLowerCase() + '_jujuy';
    var idInsumo = porNombre[clave];
    if (!idInsumo) {
      idInsumo = generarIdInsumo(hojaInsumos);
      hojaInsumos.appendRow([
        idInsumo, item[5], item[0], item[2], 'Jujuy', item[4],
        Math.max(item[4] * 2, item[4] + 1), 'Sí'
      ]);
      porNombre[clave] = idInsumo;
    }

    if (item[1] > 0 && !cargasIniciales[idInsumo]) {
      var precioUnitario = Math.round((item[3] / item[1]) * 10000) / 10000;
      hojaIngresos.appendRow([
        generarIdUnico('ING', hojaIngresos), getFechaHoraActual(), 'Jujuy', idInsumo,
        item[0], item[1], precioUnitario, item[3], 'Stock existente', 'Stock inicial',
        'CARGA-INICIAL-AUTOSOL', 'Carga inicial', ''
      ]);
      cargasIniciales[idInsumo] = true;
    }
  }

  var colaboradores = [
    ['Alanoca', 'Taller', 'Jujuy', 'Sí'], ['Poclava', 'Taller', 'Jujuy', 'Sí'],
    ['Fernández', 'Taller', 'Jujuy', 'Sí'], ['García', 'Taller', 'Jujuy', 'Sí'],
    ['Araya', 'Taller', 'Jujuy', 'Sí'], ['Cruz', 'Taller', 'Jujuy', 'Sí'],
    ['Ramos', 'Taller', 'Jujuy', 'Sí'], ['Silva', 'Taller', 'Jujuy', 'Sí'],
    ['Mamani', 'Taller', 'Jujuy', 'Sí'], ['Pereyra', 'Taller', 'Jujuy', 'Sí']
  ];
  var colabData = hojaColaboradores.getDataRange().getValues();
  var colabSet = {};
  for (var d = 1; d < colabData.length; d++) {
    colabSet[String(colabData[d][0]).trim().toLowerCase() + '_' + String(colabData[d][2]).trim().toLowerCase()] = true;
  }
  for (var p = 0; p < colaboradores.length; p++) {
    var claveColab = colaboradores[p][0].toLowerCase() + '_jujuy';
    if (!colabSet[claveColab]) hojaColaboradores.appendRow(colaboradores[p]);
  }

  recalcularStockCompleto();
  return 'Inventario y colaboradores de Autosol cargados correctamente.';
}

/**
 * Repara una carga inicial cuyos movimientos hayan quedado vinculados a IDs anteriores.
 * Sólo elimina movimientos marcados CARGA-INICIAL-AUTOSOL; no toca movimientos reales.
 */
function repararStockInicialAutosol() {
  var ss = getSpreadsheet();
  var hojaIngresos = ss.getSheetByName(CONFIG.HOJAS.INGRESOS);
  if (!hojaIngresos) throw new Error('No existe la hoja INGRESOS.');

  var data = hojaIngresos.getDataRange().getValues();
  for (var fila = data.length - 1; fila >= 1; fila--) {
    if (String(data[fila][10]).trim() === 'CARGA-INICIAL-AUTOSOL') {
      hojaIngresos.deleteRow(fila + 1);
    }
  }

  var resultado = cargarDatosInicialesAutosol();
  recalcularStockCompleto();
  return resultado + ' Vínculos de stock reparados.';
}

/**
 * Elimina únicamente los movimientos ficticios de prueba de las hojas INGRESOS y SALIDAS
 * (comprobantes FAC-A-0001-00084321, FAC-B-0003-00012903, FAC-A-0002-00045129, FAC-A-0001-00084550 y SAL-20260927-00001)
 * respetando el stock inicial de Autosol (CARGA-INICIAL-AUTOSOL) y cualquier movimiento real registrado.
 */
function limpiarMovimientosDePrueba() {
  var ss = getSpreadsheet();
  var hojaIngresos = ss.getSheetByName(CONFIG.HOJAS.INGRESOS);
  var hojaSalidas = ss.getSheetByName(CONFIG.HOJAS.SALIDAS);
  var borradosIngresos = 0;
  var borradosSalidas = 0;

  var idsPruebaIngresos = [
    'ING-20260920-00001',
    'ING-20260921-00002',
    'ING-20260922-00003',
    'ING-20260925-00004'
  ];

  if (hojaIngresos && hojaIngresos.getLastRow() > 1) {
    var ingData = hojaIngresos.getDataRange().getValues();
    for (var r = ingData.length - 1; r >= 1; r--) {
      var idMov = String(ingData[r][0]).trim();
      var comp = String(ingData[r][10]).trim();
      if (idsPruebaIngresos.indexOf(idMov) !== -1 || comp === 'FAC-A-0001-00084321' || comp === 'FAC-B-0003-00012903' || comp === 'FAC-A-0002-00045129' || comp === 'FAC-A-0001-00084550') {
        hojaIngresos.deleteRow(r + 1);
        borradosIngresos++;
      }
    }
  }

  if (hojaSalidas && hojaSalidas.getLastRow() > 1) {
    var salData = hojaSalidas.getDataRange().getValues();
    for (var s = salData.length - 1; s >= 1; s--) {
      var idSal = String(salData[s][0]).trim();
      if (idSal === 'SAL-20260927-00001' || idSal === 'SAL-20260929-00001' || idSal === 'SAL-20260929-00002') {
        hojaSalidas.deleteRow(s + 1);
        borradosSalidas++;
      }
    }
  }

  recalcularStockCompleto();
  return 'Se eliminaron ' + borradosIngresos + ' ingresos y ' + borradosSalidas + ' salidas de prueba. Stock recalculado.';
}

// ============================================================================
// Auth.gs
// ============================================================================

/**
 * Control de Insumos - Autenticación con PIN y Gestión de Sesiones
 */

/**
 * Valida el PIN ingresado por el responsable
 * @param {string} pin
 * @returns {Object} Respuesta con token de sesión y nombre del responsable
 */
function validarPinResponsable(pin) {
  if (!pin || String(pin).trim() === '') {
    return crearRespuesta(false, null, 'El PIN no puede estar vacío.', 'PIN_VACIO');
  }

  var cleanPin = String(pin).trim();
  var mapaResponsables = getResponsablesMap();

  var nombre = mapaResponsables[cleanPin];
  if (!nombre) {
    return crearRespuesta(false, null, 'PIN incorrecto. Acceso denegado.', 'PIN_INVALIDO');
  }

  // Generar token de sesión único y efímero
  var token = 'tok_' + Utilities.getUuid().replace(/-/g, '') + '_' + Date.now();
  var duracionSeg = CONFIG.DURACION_SESION_SEG || 1800; // 30 minutos

  // Guardar en CacheService de Apps Script
  var cache = CacheService.getScriptCache();
  var sessionData = JSON.stringify({
    responsableNombre: nombre,
    creadoEn: Date.now(),
    expiraEn: Date.now() + (duracionSeg * 1000)
  });

  cache.put(token, sessionData, duracionSeg);

  return crearRespuesta(true, {
    token: token,
    responsableNombre: nombre,
    expiresAt: Date.now() + (duracionSeg * 1000)
  }, 'PIN validado correctamente. Bienvenido/a ' + nombre);
}

/**
 * Verifica si un token de sesión es válido
 * @param {string} token
 * @returns {Object|null} Datos de la sesión o null si es inválido
 */
function verificarSesion(token) {
  if (!token) return null;
  var cache = CacheService.getScriptCache();
  var data = cache.get(token);
  if (!data) return null;

  try {
    var parsed = JSON.parse(data);
    if (Date.now() > parsed.expiraEn) {
      cache.remove(token);
      return null;
    }
    return parsed;
  } catch (e) {
    return null;
  }
}

// ============================================================================
// Stock.gs
// ============================================================================

/**
 * Control de Insumos - Cálculo de Stock y Costo Promedio Ponderado
 */

/**
 * Obtiene el inventario actual y cálculos de stock
 * @param {string} [provinciaFiltro]
 * @returns {Array<Object>}
 */
function obtenerStock(provinciaFiltro) {
  var ss = getSpreadsheet();
  var hojaInsumos = ss.getSheetByName(CONFIG.HOJAS.INSUMOS);
  var hojaIngresos = ss.getSheetByName(CONFIG.HOJAS.INGRESOS);
  var hojaSalidas = ss.getSheetByName(CONFIG.HOJAS.SALIDAS);

  if (!hojaInsumos) return [];

  var insumosData = hojaInsumos.getDataRange().getValues();
  if (insumosData.length <= 1) return [];

  // Mapear ingresos en memoria (eficiencia sin múltiples getRange)
  var ingresosData = hojaIngresos ? hojaIngresos.getDataRange().getValues() : [];
  var salidasData = hojaSalidas ? hojaSalidas.getDataRange().getValues() : [];

  var stockCalculado = [];

  // Diccionario de ingresos por clave: ID_PROVINCIA
  var ingresosMap = {};
  for (var i = 1; i < ingresosData.length; i++) {
    var rowIng = ingresosData[i];
    var provIng = String(rowIng[2]).trim().toLowerCase();
    var idInsIng = String(rowIng[3]).trim();
    var cantIng = parseNumeroSeguro(rowIng[5]);
    var totIng = parseNumeroSeguro(rowIng[7]);

    var key = idInsIng + '_' + provIng;
    if (!ingresosMap[key]) {
      ingresosMap[key] = { cantidad: 0, totalValor: 0 };
    }
    ingresosMap[key].cantidad += cantIng;
    ingresosMap[key].totalValor += totIng;
  }

  // Diccionario de salidas válidas por clave: ID_PROVINCIA
  // Regla estricta: Solo AUTORIZADO y AUTORIZADO PARCIAL descuentan stock.
  var salidasMap = {};
  for (var s = 1; s < salidasData.length; s++) {
    var rowSal = salidasData[s];
    var provSal = String(rowSal[2]).trim().toLowerCase();
    var idInsSal = String(rowSal[4]).trim();
    var cantAuth = parseNumeroSeguro(rowSal[8]); // Columna I: Cantidad Autorizada
    var estadoSal = String(rowSal[13]).trim().toUpperCase(); // Columna N: Estado

    if (estadoSal === 'AUTORIZADO' || estadoSal === 'AUTORIZADO PARCIAL') {
      var keySal = idInsSal + '_' + provSal;
      if (!salidasMap[keySal]) {
        salidasMap[keySal] = 0;
      }
      salidasMap[keySal] += cantAuth;
    }
  }

  // Iterar sobre catálogo de insumos
  for (var k = 1; k < insumosData.length; k++) {
    var rowIns = insumosData[k];
    var id = String(rowIns[0]).trim();
    var categoria = String(rowIns[1]);
    var insumo = String(rowIns[2]);
    var unidad = String(rowIns[3]);
    var provincia = String(rowIns[4]).trim();
    var stockMin = parseNumeroSeguro(rowIns[5]);
    var stockObj = parseNumeroSeguro(rowIns[6]);
    var activo = String(rowIns[7]).trim();

    if (provinciaFiltro && provincia.toLowerCase() !== String(provinciaFiltro).trim().toLowerCase()) {
      continue;
    }

    var keyItem = id + '_' + provincia.toLowerCase();
    var ingInfo = ingresosMap[keyItem] || { cantidad: 0, totalValor: 0 };
    var totalSalido = salidasMap[keyItem] || 0;

    var totalIngresado = ingInfo.cantidad;
    var totalValorIngresado = ingInfo.totalValor;

    // Costo promedio ponderado
    var costoPromedio = totalIngresado > 0 ? (totalValorIngresado / totalIngresado) : 0;
    costoPromedio = Math.round(costoPromedio * 100) / 100;

    // Stock actual (mínimo 0 para evitar negativos anómalos)
    var stockActual = Math.max(0, totalIngresado - totalSalido);
    var valorStock = Math.round(stockActual * costoPromedio * 100) / 100;

    // Cantidad a reponer
    var cantidadReponer = 0;
    if (stockActual <= stockMin) {
      cantidadReponer = Math.max(0, stockObj - stockActual);
    }

    // Estado visual centralizado
    var estado = 'SUFICIENTE';
    if (stockActual <= stockMin) {
      estado = 'CRITICO';
    } else if (stockActual <= stockMin * 1.3) {
      estado = 'CERCA_MINIMO';
    }

    stockCalculado.push({
      idInsumo: id,
      provincia: provincia,
      categoria: categoria,
      insumo: insumo,
      unidad: unidad,
      totalIngresado: totalIngresado,
      totalSalido: totalSalido,
      stockActual: stockActual,
      costoPromedio: costoPromedio,
      valorStock: valorStock,
      stockMinimo: stockMin,
      stockObjetivo: stockObj,
      cantidadReponer: cantidadReponer,
      estado: estado,
      activo: activo
    });
  }

  return stockCalculado;
}

/**
 * Recalcula toda la hoja STOCK en un único lote eficiente
 */
function recalcularStockCompleto() {
  var ss = getSpreadsheet();
  var hojaStock = ss.getSheetByName(CONFIG.HOJAS.STOCK);
  if (!hojaStock) {
    hojaStock = ss.insertSheet(CONFIG.HOJAS.STOCK);
  }

  var items = obtenerStock();
  var rows = [];

  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    rows.push([
      it.idInsumo,
      it.provincia,
      it.categoria,
      it.insumo,
      it.unidad,
      it.totalIngresado,
      it.totalSalido,
      it.stockActual,
      it.costoPromedio,
      it.valorStock,
      it.stockMinimo,
      it.stockObjetivo,
      it.cantidadReponer,
      it.estado === 'CRITICO' ? 'CRÍTICO / BAJO MÍNIMO' : (it.estado === 'CERCA_MINIMO' ? 'CERCA DEL MÍNIMO' : 'SUFICIENTE')
    ]);
  }

  // Limpiar datos anteriores respetando encabezados
  var lastRow = hojaStock.getLastRow();
  if (lastRow > 1) {
    hojaStock.getRange(2, 1, lastRow - 1, hojaStock.getLastColumn()).clearContent();
  }

  if (rows.length > 0) {
    var range = hojaStock.getRange(2, 1, rows.length, rows[0].length);
    range.setValues(rows);

    // Formatear monedas y números
    hojaStock.getRange(2, 9, rows.length, 2).setNumberFormat('$#,##0.00'); // Costo Promedio y Valor Stock
    hojaStock.getRange(2, 6, rows.length, 3).setNumberFormat('#,##0.00'); // Totales y Stock Actual
    hojaStock.getRange(2, 11, rows.length, 3).setNumberFormat('#,##0.00'); // Mínimo, Objetivo, Reponer
  }

  return crearRespuesta(true, { actualizados: rows.length }, 'Stock recalculado exitosamente.');
}

// ============================================================================
// Solicitudes.gs
// ============================================================================

/**
 * Control de Insumos - Gestión de Solicitudes y Autorizaciones
 */

/**
 * Registra una nueva solicitud de retiro (Colaborador)
 * @param {Object} payload
 */
function crearSolicitud(payload) {
  if (!payload) {
    return crearRespuesta(false, null, 'Datos incompletos.', 'DATOS_VACIOS');
  }

  var provincia = String(payload.provincia || '').trim();
  var sector = String(payload.sector || '').trim();
  var idInsumo = String(payload.idInsumo || '').trim();
  var solicitante = String(payload.solicitante || '').trim();
  var cantidad = parseNumeroSeguro(payload.cantidadSolicitada);
  var observaciones = String(payload.observaciones || '').trim();

  // Validaciones
  if (!provincia || !sector || !idInsumo || !solicitante) {
    return crearRespuesta(false, null, 'Todos los campos obligatorios deben completarse.', 'CAMPOS_REQUERIDOS');
  }

  if (cantidad <= 0) {
    return crearRespuesta(false, null, 'La cantidad solicitada debe ser mayor a 0.', 'CANTIDAD_INVALIDA');
  }

  var ss = getSpreadsheet();
  var hojaInsumos = ss.getSheetByName(CONFIG.HOJAS.INSUMOS);
  var hojaSalidas = ss.getSheetByName(CONFIG.HOJAS.SALIDAS);

  if (!hojaInsumos || !hojaSalidas) {
    return crearRespuesta(false, null, 'Error en la configuración de hojas.', 'HOJAS_NO_ENCONTRADAS');
  }

  // Verificar que el insumo exista y esté activo
  var insumosData = hojaInsumos.getDataRange().getValues();
  var insumoNombre = '';
  var activo = 'No';

  for (var i = 1; i < insumosData.length; i++) {
    if (String(insumosData[i][0]).trim() === idInsumo &&
        String(insumosData[i][4]).trim().toLowerCase() === provincia.toLowerCase()) {
      insumoNombre = String(insumosData[i][2]);
      activo = String(insumosData[i][7]).trim();
      break;
    }
  }

  if (!insumoNombre || activo !== 'Sí') {
    return crearRespuesta(false, null, 'El insumo seleccionado no existe o no se encuentra activo.', 'INSUMO_INACTIVO');
  }

  // Verificar stock físicamente disponible
  var stockList = obtenerStock(provincia);
  var stockItem = null;
  for (var s = 0; s < stockList.length; s++) {
    if (stockList[s].idInsumo === idInsumo) {
      stockItem = stockList[s];
      break;
    }
  }

  var stockActual = stockItem ? stockItem.stockActual : 0;
  if (cantidad > stockActual) {
    return crearRespuesta(false, {
      solicitado: cantidad,
      stockActual: stockActual,
      maximoDisponible: stockActual
    }, 'CANTIDAD NO DISPONIBLE. Solicitado: ' + cantidad + ' | Stock actual: ' + stockActual, 'STOCK_INSUFICIENTE');
  }

  // Bloquear brevemente la generación y escritura para evitar IDs duplicados.
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return crearRespuesta(false, null, 'El sistema está ocupado. Intentá nuevamente.', 'LOCK_TIMEOUT');
  }

  var idSolicitud = '';
  var fechaHora = '';

  var nuevaFila = [
    idSolicitud,
    fechaHora,
    provincia,
    sector,
    idInsumo,
    insumoNombre,
    solicitante,
    cantidad,
    0, // Cantidad autorizada (aún pendiente)
    '', // Autorizado por
    '', // Fecha autorización
    0,  // Costo unitario
    0,  // Valor salida
    'PENDIENTE',
    observaciones,
    ''  // Motivo rechazo
  ];

  try {
    idSolicitud = generarIdUnico('SAL', hojaSalidas);
    fechaHora = getFechaHoraActual();
    nuevaFila[0] = idSolicitud;
    nuevaFila[1] = fechaHora;
    hojaSalidas.appendRow(nuevaFila);
  } finally {
    lock.releaseLock();
  }

  return crearRespuesta(true, {
    idSolicitud: idSolicitud,
    fechaHoraSolicitud: fechaHora,
    provincia: provincia,
    sector: sector,
    idInsumo: idInsumo,
    insumo: insumoNombre,
    solicitante: solicitante,
    cantidadSolicitada: cantidad,
    cantidadAutorizada: 0,
    autorizadoPor: '',
    fechaHoraAutorizacion: '',
    costoUnitario: 0,
    valorSalida: 0,
    estado: 'PENDIENTE',
    observaciones: observaciones,
    motivoRechazo: ''
  }, 'Solicitud registrada correctamente. Pendiente de autorización.');
}

/**
 * Obtiene las solicitudes en estado PENDIENTE
 * @param {string} [provinciaFiltro]
 */
function obtenerSolicitudesPendientes(provinciaFiltro) {
  var ss = getSpreadsheet();
  var hojaSalidas = ss.getSheetByName(CONFIG.HOJAS.SALIDAS);
  if (!hojaSalidas) return [];

  var data = hojaSalidas.getDataRange().getValues();
  if (data.length <= 1) return [];

  var stockList = obtenerStock(provinciaFiltro);
  var stockMap = {};
  for (var k = 0; k < stockList.length; k++) {
    var key = stockList[k].idInsumo + '_' + stockList[k].provincia.toLowerCase();
    stockMap[key] = stockList[k];
  }

  var pendientes = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var estado = String(row[13]).trim().toUpperCase();

    if (estado === 'PENDIENTE') {
      var prov = String(row[2]).trim();
      if (provinciaFiltro && prov.toLowerCase() !== String(provinciaFiltro).trim().toLowerCase()) {
        continue;
      }

      var idIns = String(row[4]).trim();
      var keyLookup = idIns + '_' + prov.toLowerCase();
      var stInfo = stockMap[keyLookup] || { stockActual: 0, stockMinimo: 0, unidad: '' };

      pendientes.push({
        idSolicitud: String(row[0]),
        fechaHoraSolicitud: String(row[1]),
        provincia: prov,
        sector: String(row[3]),
        idInsumo: idIns,
        insumo: String(row[5]),
        solicitante: String(row[6]),
        cantidadSolicitada: parseNumeroSeguro(row[7]),
        cantidadAutorizada: 0,
        estado: 'PENDIENTE',
        observaciones: String(row[14] || ''),
        stockActual: stInfo.stockActual,
        stockMinimo: stInfo.stockMinimo,
        unidad: stInfo.unidad || ''
      });
    }
  }

  // Ordenar: más antiguas primero
  pendientes.sort(function(a, b) {
    return String(a.fechaHoraSolicitud).localeCompare(String(b.fechaHoraSolicitud));
  });

  return pendientes;
}

/**
 * Autoriza una solicitud (Total o Parcial) con protección de concurrencia y LockService
 */
function autorizarSolicitud(idSolicitud, cantidadAutorizada, token) {
  var session = verificarSesion(token);
  if (!session) {
    return crearRespuesta(false, null, 'Sesión expirada o inválida. Ingrese el PIN de responsable nuevamente.', 'SESION_EXPIRADA');
  }

  var cantAuth = parseNumeroSeguro(cantidadAutorizada);
  if (cantAuth <= 0) {
    return crearRespuesta(false, null, 'La cantidad a autorizar debe ser mayor a 0.', 'CANTIDAD_INVALIDA');
  }

  // Uso estricto de LockService para evitar condiciones de carrera o dobles descuentos
  var lock = LockService.getScriptLock();
  var hasLock = lock.tryLock(10000); // Esperar hasta 10 segundos
  if (!hasLock) {
    return crearRespuesta(false, null, 'El servidor está ocupado procesando otra autorización. Reintentá en un momento.', 'LOCK_TIMEOUT');
  }

  try {
    var ss = getSpreadsheet();
    var hojaSalidas = ss.getSheetByName(CONFIG.HOJAS.SALIDAS);
    if (!hojaSalidas) {
      return crearRespuesta(false, null, 'Hoja SALIDAS no encontrada.', 'HOJA_NO_ENCONTRADA');
    }

    var data = hojaSalidas.getDataRange().getValues();
    var targetRowIndex = -1;
    var solicitudData = null;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(idSolicitud).trim()) {
        targetRowIndex = i + 1; // 1-indexed para getRange
        solicitudData = data[i];
        break;
      }
    }

    if (targetRowIndex === -1 || !solicitudData) {
      return crearRespuesta(false, null, 'La solicitud no existe en el sistema.', 'SOLICITUD_NO_ENCONTRADA');
    }

    var estadoActual = String(solicitudData[13]).trim().toUpperCase();
    if (estadoActual !== 'PENDIENTE') {
      return crearRespuesta(false, null, 'La solicitud ya fue procesada anteriormente con estado: ' + estadoActual, 'ESTADO_INVALIDO');
    }

    var cantSolicitada = parseNumeroSeguro(solicitudData[7]);
    if (cantAuth > cantSolicitada) {
      return crearRespuesta(false, null, 'No se puede autorizar más de la cantidad solicitada (' + cantSolicitada + ').', 'EXCEDE_SOLICITADO');
    }

    var idInsumo = String(solicitudData[4]).trim();
    var provincia = String(solicitudData[2]).trim();

    // Comprobación de concurrencia: consultar stock REAL en este instante
    var stockList = obtenerStock(provincia);
    var stockItem = null;
    for (var k = 0; k < stockList.length; k++) {
      if (stockList[k].idInsumo === idInsumo) {
        stockItem = stockList[k];
        break;
      }
    }

    var stockActual = stockItem ? stockItem.stockActual : 0;
    var costoVigente = stockItem ? stockItem.costoPromedio : 0;

    if (cantAuth > stockActual) {
      return crearRespuesta(false, {
        stockActual: stockActual,
        cantidadRequerida: cantAuth
      }, 'STOCK INSUFICIENTE. Disponible actualmente: ' + stockActual + ' unidades. No se pueden autorizar ' + cantAuth + ' unidades.', 'STOCK_INSUFICIENTE');
    }

    var nuevoEstado = (cantAuth === cantSolicitada) ? 'AUTORIZADO' : 'AUTORIZADO PARCIAL';
    var fechaHoraAuth = getFechaHoraActual();
    var valorSalida = Math.round(cantAuth * costoVigente * 100) / 100;

    // Actualizar columnas en la hoja SALIDAS:
    // I: Cantidad Autorizada (col 9)
    // J: Autorizado Por (col 10)
    // K: Fecha/Hora Autorización (col 11)
    // L: Costo Unitario (col 12)
    // M: Valor Salida (col 13)
    // N: Estado (col 14)
    var updateRange = hojaSalidas.getRange(targetRowIndex, 9, 1, 6);
    updateRange.setValues([[
      cantAuth,
      session.responsableNombre,
      fechaHoraAuth,
      costoVigente,
      valorSalida,
      nuevoEstado
    ]]);

    // Re-sincronizar hoja STOCK
    recalcularStockCompleto();

    return crearRespuesta(true, {
      idSolicitud: idSolicitud,
      insumo: String(solicitudData[5]),
      cantidadSolicitada: cantSolicitada,
      cantidadAutorizada: cantAuth,
      autorizadoPor: session.responsableNombre,
      estado: nuevoEstado,
      stockAnterior: stockActual,
      stockActual: stockActual - cantAuth
    }, 'Salida autorizada (' + nuevoEstado + ') por ' + session.responsableNombre);

  } finally {
    lock.releaseLock();
  }
}

/**
 * Rechaza una solicitud pendiente
 */
function rechazarSolicitud(idSolicitud, motivoRechazo, token) {
  var session = verificarSesion(token);
  if (!session) {
    return crearRespuesta(false, null, 'Sesión expirada o inválida. Ingrese el PIN de responsable nuevamente.', 'SESION_EXPIRADA');
  }

  var lock = LockService.getScriptLock();
  var hasLock = lock.tryLock(10000);
  if (!hasLock) {
    return crearRespuesta(false, null, 'El servidor está ocupado. Reintentá en un momento.', 'LOCK_TIMEOUT');
  }

  try {
    var ss = getSpreadsheet();
    var hojaSalidas = ss.getSheetByName(CONFIG.HOJAS.SALIDAS);
    var data = hojaSalidas.getDataRange().getValues();
    var targetRowIndex = -1;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(idSolicitud).trim()) {
        targetRowIndex = i + 1;
        break;
      }
    }

    if (targetRowIndex === -1) {
      return crearRespuesta(false, null, 'La solicitud no fue encontrada.', 'NO_ENCONTRADA');
    }

    var fechaHora = getFechaHoraActual();
    // Columna I (9) a P (16)
    // Cantidad Autorizada: 0, Autorizado Por: Responsable, Fecha: now, Costo: 0, Valor: 0, Estado: RECHAZADO, Obs: '', Motivo: motivo
    hojaSalidas.getRange(targetRowIndex, 9, 1, 8).setValues([[
      0,
      session.responsableNombre,
      fechaHora,
      0,
      0,
      'RECHAZADO',
      data[targetRowIndex - 1][14],
      String(motivoRechazo || '').trim()
    ]]);

    return crearRespuesta(true, { idSolicitud: idSolicitud, estado: 'RECHAZADO' }, 'Solicitud rechazada.');
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
// Ingresos.gs
// ============================================================================

/**
 * Control de Insumos - Gestión de Ingresos de Mercadería
 */

/**
 * Registra un nuevo ingreso de insumos
 */
function registrarIngreso(payload, token) {
  var session = verificarSesion(token);
  if (!session) {
    return crearRespuesta(false, null, 'Sesión expirada o inválida. Ingrese el PIN de responsable nuevamente.', 'SESION_EXPIRADA');
  }

  if (!payload) {
    return crearRespuesta(false, null, 'Datos incompletos.', 'DATOS_VACIOS');
  }

  var provincia = String(payload.provincia || '').trim();
  var idInsumo = String(payload.idInsumo || '').trim();
  var cantidad = parseNumeroSeguro(payload.cantidad);
  var precioUnitario = parseNumeroSeguro(payload.precioUnitario);
  var proveedor = String(payload.proveedor || '').trim();
  var tipoIngreso = String(payload.tipoIngreso || 'Compra').trim();
  var comprobante = String(payload.comprobante || '').trim();
  var observaciones = String(payload.observaciones || '').trim();

  if (!provincia || !idInsumo) {
    return crearRespuesta(false, null, 'Provincia e Insumo son obligatorios.', 'CAMPOS_REQUERIDOS');
  }

  if (cantidad <= 0) {
    return crearRespuesta(false, null, 'La cantidad ingresada debe ser mayor a 0.', 'CANTIDAD_INVALIDA');
  }

  if (precioUnitario < 0) {
    return crearRespuesta(false, null, 'El precio unitario no puede ser negativo.', 'PRECIO_INVALIDO');
  }

  var lock = LockService.getScriptLock();
  var hasLock = lock.tryLock(10000);
  if (!hasLock) {
    return crearRespuesta(false, null, 'Servidor ocupado. Intente en unos segundos.', 'LOCK_TIMEOUT');
  }

  try {
    var ss = getSpreadsheet();
    var hojaInsumos = ss.getSheetByName(CONFIG.HOJAS.INSUMOS);
    var hojaIngresos = ss.getSheetByName(CONFIG.HOJAS.INGRESOS);

    if (!hojaInsumos || !hojaIngresos) {
      return crearRespuesta(false, null, 'Hojas no configuradas.', 'HOJAS_NO_ENCONTRADAS');
    }

    // Buscar nombre del insumo
    var insumosData = hojaInsumos.getDataRange().getValues();
    var insumoNombre = '';
    for (var i = 1; i < insumosData.length; i++) {
      if (String(insumosData[i][0]).trim() === idInsumo &&
          String(insumosData[i][4]).trim().toLowerCase() === provincia.toLowerCase()) {
        insumoNombre = String(insumosData[i][2]);
        break;
      }
    }

    if (!insumoNombre) {
      return crearRespuesta(false, null, 'Insumo no encontrado para la provincia especificada.', 'INSUMO_NO_ENCONTRADO');
    }

    var idMovimiento = generarIdUnico('ING', hojaIngresos);
    var fechaHora = getFechaHoraActual();
    var total = Math.round(cantidad * precioUnitario * 100) / 100;

    var fila = [
      idMovimiento,
      fechaHora,
      provincia,
      idInsumo,
      insumoNombre,
      cantidad,
      precioUnitario,
      total,
      proveedor,
      tipoIngreso,
      comprobante,
      session.responsableNombre,
      observaciones
    ];

    hojaIngresos.appendRow(fila);

    // Formatear la fila recién agregada
    var lastRow = hojaIngresos.getLastRow();
    hojaIngresos.getRange(lastRow, 6).setNumberFormat('#,##0.00'); // Cantidad
    hojaIngresos.getRange(lastRow, 7, 1, 2).setNumberFormat('$#,##0.00'); // Precio y Total

    // Re-sincronizar el inventario
    recalcularStockCompleto();

    return crearRespuesta(true, {
      idMovimiento: idMovimiento,
      fechaHora: fechaHora,
      provincia: provincia,
      idInsumo: idInsumo,
      insumo: insumoNombre,
      cantidad: cantidad,
      precioUnitario: precioUnitario,
      total: total,
      proveedor: proveedor,
      tipoIngreso: tipoIngreso,
      comprobante: comprobante,
      responsable: session.responsableNombre,
      observaciones: observaciones
    }, 'Ingreso registrado con éxito. Total: $ ' + total);

  } finally {
    lock.releaseLock();
  }
}

/**
 * Obtiene lista única de proveedores para autocompletado
 */
function obtenerProveedoresSugeridos() {
  var ss = getSpreadsheet();
  var hojaIngresos = ss.getSheetByName(CONFIG.HOJAS.INGRESOS);
  if (!hojaIngresos) return [];

  var data = hojaIngresos.getDataRange().getValues();
  if (data.length <= 1) return [];

  var set = {};
  for (var i = 1; i < data.length; i++) {
    var p = String(data[i][8] || '').trim();
    if (p) set[p] = true;
  }

  return Object.keys(set).sort();
}

// ============================================================================
// Catalogo.gs
// ============================================================================

/** Gestión del catálogo y colaboradores desde la aplicación. */
function guardarInsumo(payload, token) {
  var session = verificarSesion(token);
  if (!session) return crearRespuesta(false, null, 'Sesión expirada.', 'SESION_EXPIRADA');

  var id = String(payload.id || '').trim();
  var nombre = String(payload.insumo || '').trim();
  var categoria = String(payload.categoria || '').trim();
  var unidad = String(payload.unidad || '').trim();
  var provincia = String(payload.provincia || '').trim();
  var stockMinimo = parseNumeroSeguro(payload.stockMinimo);
  var stockObjetivo = parseNumeroSeguro(payload.stockObjetivo);
  var activo = String(payload.activo || 'Sí').trim();

  if (!nombre || !categoria || !unidad || !provincia) {
    return crearRespuesta(false, null, 'Completá nombre, categoría, unidad y provincia.', 'CAMPOS_REQUERIDOS');
  }
  if (stockMinimo < 0 || stockObjetivo < stockMinimo) {
    return crearRespuesta(false, null, 'El stock objetivo debe ser igual o mayor al mínimo.', 'STOCK_INVALIDO');
  }

  var hoja = getSpreadsheet().getSheetByName(CONFIG.HOJAS.INSUMOS);
  var data = hoja.getDataRange().getValues();
  var fila = -1;
  for (var i = 1; i < data.length; i++) {
    if (id && String(data[i][0]).trim() === id) fila = i + 1;
    if (!id && String(data[i][2]).trim().toLowerCase() === nombre.toLowerCase() &&
        String(data[i][4]).trim().toLowerCase() === provincia.toLowerCase()) {
      return crearRespuesta(false, null, 'Ya existe un insumo con ese nombre en la provincia.', 'DUPLICADO');
    }
  }

  if (!id) id = generarIdInsumo(hoja);
  var valores = [[id, categoria, nombre, unidad, provincia, stockMinimo, stockObjetivo, activo]];
  if (fila > 0) hoja.getRange(fila, 1, 1, 8).setValues(valores);
  else hoja.appendRow(valores[0]);

  recalcularStockCompleto();
  return crearRespuesta(true, {
    id: id, categoria: categoria, insumo: nombre, unidad: unidad, provincia: provincia,
    stockMinimo: stockMinimo, stockObjetivo: stockObjetivo, activo: activo
  }, fila > 0 ? 'Insumo actualizado.' : 'Insumo creado.');
}

function guardarColaborador(payload, token) {
  var session = verificarSesion(token);
  if (!session) return crearRespuesta(false, null, 'Sesión expirada.', 'SESION_EXPIRADA');
  var nombre = String(payload.nombre || '').trim();
  var nombreOriginal = String(payload.nombreOriginal || '').trim();
  var sector = String(payload.sector || '').trim();
  var provincia = String(payload.provincia || '').trim();
  var activo = String(payload.activo || 'Sí').trim();
  if (!nombre || CONFIG.SECTORES.indexOf(sector) === -1 || !provincia) {
    return crearRespuesta(false, null, 'Completá nombre, sector y provincia.', 'CAMPOS_REQUERIDOS');
  }

  var hoja = getSpreadsheet().getSheetByName(CONFIG.HOJAS.COLABORADORES);
  var data = hoja.getDataRange().getValues();
  var fila = -1;
  for (var i = 1; i < data.length; i++) {
    var mismo = String(data[i][0]).trim().toLowerCase() === (nombreOriginal || nombre).toLowerCase();
    var mismaProvincia = String(data[i][2]).trim().toLowerCase() === provincia.toLowerCase();
    if (mismo && mismaProvincia) { fila = i + 1; break; }
  }
  var valores = [[nombre, sector, provincia, activo]];
  if (fila > 0) hoja.getRange(fila, 1, 1, 4).setValues(valores);
  else hoja.appendRow(valores[0]);
  return crearRespuesta(true, { nombre: nombre, sector: sector, provincia: provincia }, fila > 0 ? 'Colaborador actualizado.' : 'Colaborador creado.');
}

// ============================================================================
// Api.gs
// ============================================================================

/**
 * Control de Insumos - Router API Web App (doGet y doPost)
 */

function doGet(e) {
  return handleRequest(e || {});
}

function doPost(e) {
  return handleRequest(e || {});
}

function handleRequest(e) {
  var action = '';
  var payload = {};

  try {
    // Si viene por POST con cuerpo JSON en postData.contents
    if (e.postData && e.postData.contents) {
      try {
        var parsed = JSON.parse(e.postData.contents);
        action = parsed.action || '';
        payload = parsed;
      } catch (jsonErr) {
        // En caso de postData no json
        action = (e.parameter && e.parameter.action) || '';
        payload = e.parameter || {};
      }
    } else if (e.parameter) {
      action = e.parameter.action || '';
      payload = e.parameter;
    }

    var result = null;

    switch (action) {
      case 'ping':
        result = crearRespuesta(true, {
          timestamp: getFechaHoraActual(),
          timezone: CONFIG.TIMEZONE,
          version: '1.0.0'
        }, 'Conexión exitosa con Google Apps Script y base de datos Google Sheets.');
        break;

      case 'setup':
        var setupMsg = setupSistemaInsumos();
        result = crearRespuesta(true, { message: setupMsg }, setupMsg);
        break;

      case 'validarPin':
        result = validarPinResponsable(payload.pin);
        break;

      case 'getColaboradores':
        var ssColab = getSpreadsheet();
        var hojaColaboradores = ssColab.getSheetByName(CONFIG.HOJAS.COLABORADORES);
        var colabs = [];
        if (hojaColaboradores && hojaColaboradores.getLastRow() > 1) {
          var colabData = hojaColaboradores.getDataRange().getValues();
          for (var c = 1; c < colabData.length; c++) {
            var nombreColab = String(colabData[c][0] || '').trim();
            var sectorColab = String(colabData[c][1] || '').trim();
            var provinciaColab = String(colabData[c][2] || '').trim();
            var activoColab = String(colabData[c][3] || '').trim().toLowerCase();
            if (nombreColab && (activoColab === 'sí' || activoColab === 'si')) {
              colabs.push({ nombre: nombreColab, sector: sectorColab, provincia: provinciaColab });
            }
          }
        }
        if (payload.provincia) {
          colabs = colabs.filter(function(c) {
            return c.provincia.toLowerCase() === String(payload.provincia).toLowerCase();
          });
        }
        result = crearRespuesta(true, colabs);
        break;

      case 'getInsumos':
        var ss = getSpreadsheet();
        var hojaInsumos = ss.getSheetByName(CONFIG.HOJAS.INSUMOS);
        var insumos = [];
        if (hojaInsumos) {
          var data = hojaInsumos.getDataRange().getValues();
          for (var i = 1; i < data.length; i++) {
            var row = data[i];
            var prov = String(row[4]).trim();
            if (payload.provincia && prov.toLowerCase() !== String(payload.provincia).trim().toLowerCase()) {
              continue;
            }
            insumos.push({
              id: String(row[0]).trim(),
              categoria: String(row[1]),
              insumo: String(row[2]),
              unidad: String(row[3]),
              provincia: prov,
              stockMinimo: parseNumeroSeguro(row[5]),
              stockObjetivo: parseNumeroSeguro(row[6]),
              activo: String(row[7]).trim()
            });
          }
        }
        result = crearRespuesta(true, insumos);
        break;

      case 'guardarInsumo':
        result = guardarInsumo(payload, payload.token);
        break;

      case 'guardarColaborador':
        result = guardarColaborador(payload, payload.token);
        break;

      case 'getStock':
        var stock = obtenerStock(payload.provincia);
        result = crearRespuesta(true, stock);
        break;

      case 'crearSolicitud':
        result = crearSolicitud(payload);
        break;

      case 'getSolicitudesPendientes':
        var pendientes = obtenerSolicitudesPendientes(payload.provincia);
        result = crearRespuesta(true, pendientes);
        break;

      case 'autorizarSolicitud':
        result = autorizarSolicitud(payload.idSolicitud, payload.cantidadAutorizada, payload.token);
        break;

      case 'rechazarSolicitud':
        result = rechazarSolicitud(payload.idSolicitud, payload.motivoRechazo, payload.token);
        break;

      case 'registrarIngreso':
        result = registrarIngreso(payload, payload.token);
        break;

      case 'recalcularStockCompleto':
        result = recalcularStockCompleto();
        break;

      case 'getProveedoresSugeridos':
        var provs = obtenerProveedoresSugeridos();
        result = crearRespuesta(true, provs);
        break;

      case 'getUltimosMovimientos':
        result = obtenerHistorialMovimientos(payload.limit || 20);
        break;

      case 'limpiarMovimientosDePrueba':
        var cleanMsg = limpiarMovimientosDePrueba();
        result = crearRespuesta(true, { message: cleanMsg }, cleanMsg);
        break;

      default:
        result = crearRespuesta(false, null, 'Acción no reconocida: ' + action, 'ACCION_DESCONOCIDA');
        break;
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    console.error('Error no controlado en Apps Script: ' + err.toString());
    var errorResponse = crearRespuesta(
      false,
      null,
      'Ocurrió un error en el servidor. Por favor intente nuevamente.',
      'SERVER_ERROR',
      err.message
    );
    return ContentService
      .createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Obtiene los últimos movimientos combinados (Ingresos y Salidas)
 */
function obtenerHistorialMovimientos(limit) {
  var ss = getSpreadsheet();
  var hojaInsumos = ss.getSheetByName(CONFIG.HOJAS.INSUMOS);
  var hojaIngresos = ss.getSheetByName(CONFIG.HOJAS.INGRESOS);
  var hojaSalidas = ss.getSheetByName(CONFIG.HOJAS.SALIDAS);

  var insumosMap = {};
  if (hojaInsumos) {
    var insData = hojaInsumos.getDataRange().getValues();
    for (var k = 1; k < insData.length; k++) {
      insumosMap[String(insData[k][0]).trim() + '_' + String(insData[k][4]).trim().toLowerCase()] = String(insData[k][3]);
    }
  }

  var movimientos = [];

  if (hojaIngresos) {
    var ingData = hojaIngresos.getDataRange().getValues();
    for (var i = 1; i < ingData.length; i++) {
      var rIng = ingData[i];
      var provI = String(rIng[2]).trim();
      var idInsI = String(rIng[3]).trim();
      var unI = insumosMap[idInsI + '_' + provI.toLowerCase()] || 'u';
      movimientos.push({
        id: String(rIng[0]),
        fechaHora: String(rIng[1]),
        tipo: 'INGRESO',
        idInsumo: idInsI,
        insumo: String(rIng[4]),
        unidad: unI,
        provincia: provI,
        cantidad: parseNumeroSeguro(rIng[5]),
        persona: String(rIng[11]),
        sectorOProveedor: String(rIng[8]) ? String(rIng[8]) + ' (' + String(rIng[9]) + ')' : String(rIng[9]),
        estado: 'REGISTRADO',
        monto: parseNumeroSeguro(rIng[7])
      });
    }
  }

  if (hojaSalidas) {
    var salData = hojaSalidas.getDataRange().getValues();
    for (var s = 1; s < salData.length; s++) {
      var rSal = salData[s];
      var provS = String(rSal[2]).trim();
      var idInsS = String(rSal[4]).trim();
      var unS = insumosMap[idInsS + '_' + provS.toLowerCase()] || 'u';
      var cantAuth = parseNumeroSeguro(rSal[8]);
      var cantSol = parseNumeroSeguro(rSal[7]);
      movimientos.push({
        id: String(rSal[0]),
        fechaHora: String(rSal[10]) || String(rSal[1]),
        tipo: 'SALIDA',
        idInsumo: idInsS,
        insumo: String(rSal[5]),
        unidad: unS,
        provincia: provS,
        cantidad: cantAuth > 0 ? cantAuth : cantSol,
        solicitado: cantSol,
        persona: String(rSal[6]) + (rSal[9] ? ' (Aut: ' + rSal[9] + ')' : ''),
        sectorOProveedor: String(rSal[3]),
        estado: String(rSal[13]),
        monto: parseNumeroSeguro(rSal[12])
      });
    }
  }

  movimientos.sort(function(a, b) {
    return String(b.fechaHora).localeCompare(String(a.fechaHora));
  });

  return crearRespuesta(true, movimientos.slice(0, limit || 20));
}

