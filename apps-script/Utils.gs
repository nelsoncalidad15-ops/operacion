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
