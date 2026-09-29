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
