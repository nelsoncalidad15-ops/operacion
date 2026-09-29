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
