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
