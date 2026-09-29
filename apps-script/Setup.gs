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
      ejemplos: [
        [
          'ING-20260920-00001',
          '2026-09-20 08:30:00',
          'Jujuy',
          'INS-001',
          'Shampoo vehículos',
          20,
          8500,
          170000,
          'Química del Norte S.R.L.',
          'Compra',
          'FAC-A-0001-00084321',
          'Marcelo Pereyra',
          'Lote inicial de lavado'
        ],
        [
          'ING-20260921-00002',
          '2026-09-21 10:15:00',
          'Jujuy',
          'INS-002',
          'Resma A4',
          15,
          5200,
          78000,
          'Papelera San Salvador',
          'Compra',
          'FAC-B-0003-00012903',
          'Nelson Albarracín',
          'Para administración y calidad'
        ],
        [
          'ING-20260922-00003',
          '2026-09-22 14:00:00',
          'Jujuy',
          'INS-003',
          'Guantes nitrilo (Caja x100)',
          20,
          12500,
          250000,
          'Protección Industrial NOA',
          'Compra',
          'FAC-A-0002-00045129',
          'Marcelo Pereyra',
          'Reposición mensual de EPP'
        ],
        [
          'ING-20260925-00004',
          '2026-09-25 09:20:00',
          'Salta',
          'INS-007',
          'Shampoo vehículos',
          25,
          8600,
          215000,
          'Química del Norte S.R.L.',
          'Compra',
          'FAC-A-0001-00084550',
          'Pablo Guantay',
          'Stock para sucursal Salta'
        ]
      ]
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
      ejemplos: [
        [
          'SAL-20260927-00001',
          '2026-09-27 09:10:00',
          'Jujuy',
          'Lavadero',
          'INS-001',
          'Shampoo vehículos',
          'Esteban Martínez',
          2,
          2,
          'Marcelo Pereyra',
          '2026-09-27 09:30:00',
          8500,
          17000,
          'AUTORIZADO',
          'Lavado flota liviana',
          ''
        ]
      ]
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
