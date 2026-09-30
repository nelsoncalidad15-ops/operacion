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
