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
