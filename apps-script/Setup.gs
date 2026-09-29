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

  Logger.log('Sistema de Control de Insumos inicializado correctamente.');
  return 'Configuración inicial completada con éxito. Las 4 hojas están operativas.';
}
