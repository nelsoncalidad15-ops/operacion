import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Code2,
  FileSpreadsheet,
  KeyRound,
  RefreshCw,
  Sliders,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../services/api';

interface AppsScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionChange: () => void;
}

export const AppsScriptModal: React.FC<AppsScriptModalProps> = ({
  isOpen,
  onClose,
  onConnectionChange,
}) => {
  const [activeTab, setActiveTab] = useState<'conexion' | 'codigo' | 'instrucciones'>('conexion');
  const [urlInput, setUrlInput] = useState<string>(api.getAppsScriptUrl());
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Code Tab state
  const [selectedFile, setSelectedFile] = useState<string>('Config.gs');
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSaveAndTest = async () => {
    setTesting(true);
    setTestResult(null);

    const cleanUrl = urlInput.trim();
    if (!cleanUrl) {
      api.setAppsScriptUrl('');
      setTestResult({
        ok: true,
        message: 'Modo local/demostración activado. Los datos se guardan en el navegador.',
      });
      setTesting(false);
      onConnectionChange();
      return;
    }

    try {
      const res = await api.testConnection(cleanUrl);
      setTestResult(res);
      if (res.ok) {
        api.setAppsScriptUrl(cleanUrl);
        onConnectionChange();
      }
    } catch (err: any) {
      setTestResult({
        ok: false,
        message: 'Error de red al conectar con Google Apps Script.',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleResetData = () => {
    if (window.confirm('¿Reiniciar los datos de demostración a su estado inicial?')) {
      api.resetDemoData();
      window.location.reload();
    }
  };

  const codeFiles: { [filename: string]: string } = {
    'Config.gs': `/**
 * Control de Insumos - Configuración General
 */
var CONFIG = {
  HOJAS: {
    INSUMOS: 'INSUMOS',
    INGRESOS: 'INGRESOS',
    SALIDAS: 'SALIDAS',
    STOCK: 'STOCK'
  },
  TIMEZONE: 'America/Argentina/Jujuy',
  PROVINCIAS: ['Jujuy', 'Salta'],
  SECTORES: [
    'Taller', 'Lavadero', 'Repuestos', 'Administración',
    'Ventas', 'Calidad', 'Logística', 'Mantenimiento'
  ],
  DURACION_SESION_SEG: 1800, // 30 minutos
  PINS_POR_DEFECTO: {
    '1423': 'Marcelo Pereyra',
    '7852': 'Pablo Guantay',
    '9021': 'Nelson Albarracín'
  }
};

function getSpreadsheet() {
  var prop = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (prop && prop.trim() !== '') {
    return SpreadsheetApp.openById(prop.trim());
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getResponsablesMap() {
  try {
    var raw = PropertiesService.getScriptProperties().getProperty('RESPONSABLES_JSON');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error leyendo RESPONSABLES_JSON: ' + e.message);
  }
  return CONFIG.PINS_POR_DEFECTO;
}`,

    'Setup.gs': `/**
 * Control de Insumos - Instalación Inicial
 * Ejecutar setupSistemaInsumos() una sola vez en el editor de Apps Script.
 */
function setupSistemaInsumos() {
  var ss = getSpreadsheet();
  var estructuras = {
    INSUMOS: [
      'ID', 'Categoría', 'Insumo', 'Unidad', 'Provincia',
      'Stock mínimo', 'Stock objetivo', 'Activo'
    ],
    INGRESOS: [
      'ID Movimiento', 'Fecha/Hora', 'Provincia', 'ID Insumo', 'Insumo',
      'Cantidad', 'Precio Unitario', 'Total', 'Proveedor', 'Tipo Ingreso',
      'Comprobante', 'Responsable', 'Observaciones'
    ],
    SALIDAS: [
      'ID Solicitud', 'Fecha/Hora Solicitud', 'Provincia', 'Sector', 'ID Insumo',
      'Insumo', 'Solicitante', 'Cantidad Solicitada', 'Cantidad Autorizada',
      'Autorizado Por', 'Fecha/Hora Autorización', 'Costo Unitario', 'Valor Salida',
      'Estado', 'Observaciones', 'Motivo Rechazo'
    ],
    STOCK: [
      'ID Insumo', 'Provincia', 'Categoría', 'Insumo', 'Unidad',
      'Total Ingresado', 'Total Salido', 'Stock Actual', 'Costo Promedio',
      'Valor Stock', 'Stock Mínimo', 'Stock Objetivo', 'Cantidad a Reponer', 'Estado'
    ]
  };

  for (var key in estructuras) {
    var hoja = ss.getSheetByName(key) || ss.insertSheet(key);
    var cols = estructuras[key];
    if (hoja.getLastRow() === 0) {
      hoja.getRange(1, 1, 1, cols.length).setValues([cols]);
    }
    var hRange = hoja.getRange(1, 1, 1, cols.length);
    hRange.setFontWeight('bold');
    hRange.setBackground('#f1f5f9');
    hoja.setFrozenRows(1);
    for (var c = 1; c <= cols.length; c++) hoja.autoResizeColumn(c);
  }

  recalcularStockCompleto();
  return 'Configuración inicial completada con éxito. Las 4 hojas están operativas.';
}`,

    'Api.gs': `/**
 * Control de Insumos - Router API Web App (doGet y doPost)
 */
function doGet(e) { return handleRequest(e || {}); }
function doPost(e) { return handleRequest(e || {}); }

function handleRequest(e) {
  var action = '', payload = {};
  try {
    if (e.postData && e.postData.contents) {
      try {
        var parsed = JSON.parse(e.postData.contents);
        action = parsed.action || '';
        payload = parsed;
      } catch (err) {
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
        result = crearRespuesta(true, { tz: CONFIG.TIMEZONE }, 'Conexión exitosa con Google Apps Script y Sheets.');
        break;
      case 'validarPin':
        result = validarPinResponsable(payload.pin);
        break;
      case 'getInsumos':
        result = crearRespuesta(true, obtenerInsumosCatalogo(payload.provincia));
        break;
      case 'getStock':
        result = crearRespuesta(true, obtenerStock(payload.provincia));
        break;
      case 'crearSolicitud':
        result = crearSolicitud(payload);
        break;
      case 'getSolicitudesPendientes':
        result = crearRespuesta(true, obtenerSolicitudesPendientes(payload.provincia));
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
        result = crearRespuesta(true, obtenerProveedoresSugeridos());
        break;
      case 'getUltimosMovimientos':
        result = obtenerHistorialMovimientos(payload.limit || 20);
        break;
      default:
        result = crearRespuesta(false, null, 'Acción no válida: ' + action, 'ACCION_INVALIDA');
        break;
    }

    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    console.error('Error Apps Script: ' + err.toString());
    return ContentService.createTextOutput(JSON.stringify(crearRespuesta(false, null, 'Error en el servidor: ' + err.message, 'SERVER_ERROR'))).setMimeType(ContentService.MimeType.JSON);
  }
}`,

    'Solicitudes.gs': `/**
 * Control de Insumos - Solicitudes y Autorizaciones con LockService
 */
function crearSolicitud(payload) {
  var prov = String(payload.provincia || '').trim();
  var sec = String(payload.sector || '').trim();
  var idIns = String(payload.idInsumo || '').trim();
  var sol = String(payload.solicitante || '').trim();
  var cant = parseNumeroSeguro(payload.cantidadSolicitada);

  if (cant <= 0) return crearRespuesta(false, null, 'La cantidad debe ser mayor a 0.', 'CANTIDAD_INVALIDA');

  var stockList = obtenerStock(prov);
  var stItem = stockList.find(function(s) { return s.idInsumo === idIns; });
  var stockActual = stItem ? stItem.stockActual : 0;

  if (cant > stockActual) {
    return crearRespuesta(false, { solicitado: cant, stockActual: stockActual }, 'CANTIDAD NO DISPONIBLE', 'STOCK_INSUFICIENTE');
  }

  var ss = getSpreadsheet();
  var hojaSal = ss.getSheetByName(CONFIG.HOJAS.SALIDAS);
  var idSal = generarIdUnico('SAL', hojaSal);
  var now = getFechaHoraActual();

  hojaSal.appendRow([
    idSal, now, prov, sec, idIns, stItem ? stItem.insumo : '',
    sol, cant, 0, '', '', 0, 0, 'PENDIENTE', payload.observaciones || '', ''
  ]);

  return crearRespuesta(true, { idSolicitud: idSal, estado: 'PENDIENTE' }, 'Solicitud registrada correctamente.');
}

function autorizarSolicitud(idSolicitud, cantidadAutorizada, token) {
  var session = verificarSesion(token);
  if (!session) return crearRespuesta(false, null, 'Sesión inválida o expirada.', 'SESION_EXPIRADA');

  var cantAuth = parseNumeroSeguro(cantidadAutorizada);
  if (cantAuth <= 0) return crearRespuesta(false, null, 'Cantidad a autorizar debe ser mayor a 0.', 'CANTIDAD_INVALIDA');

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return crearRespuesta(false, null, 'Servidor ocupado. Reintentá.', 'LOCK_TIMEOUT');

  try {
    var ss = getSpreadsheet();
    var hoja = ss.getSheetByName(CONFIG.HOJAS.SALIDAS);
    var data = hoja.getDataRange().getValues();
    var targetRow = -1;
    var rowData = null;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(idSolicitud).trim()) {
        targetRow = i + 1;
        rowData = data[i];
        break;
      }
    }

    if (targetRow === -1) return crearRespuesta(false, null, 'Solicitud no encontrada.', 'NO_ENCONTRADA');
    if (String(rowData[13]).trim().toUpperCase() !== 'PENDIENTE') {
      return crearRespuesta(false, null, 'La solicitud ya no está pendiente.', 'ESTADO_INVALIDO');
    }

    var idInsumo = String(rowData[4]).trim();
    var prov = String(rowData[2]).trim();

    // Verificación de stock en tiempo real
    var stockList = obtenerStock(prov);
    var stItem = stockList.find(function(s) { return s.idInsumo === idInsumo; });
    var stockActual = stItem ? stItem.stockActual : 0;
    var costoVigente = stItem ? stItem.costoPromedio : 0;

    if (cantAuth > stockActual) {
      return crearRespuesta(false, null, 'STOCK INSUFICIENTE. Stock actual: ' + stockActual, 'STOCK_INSUFICIENTE');
    }

    var cantSol = parseNumeroSeguro(rowData[7]);
    var nuevoEstado = (cantAuth === cantSol) ? 'AUTORIZADO' : 'AUTORIZADO PARCIAL';
    var now = getFechaHoraActual();
    var valorSalida = Math.round(cantAuth * costoVigente * 100) / 100;

    hoja.getRange(targetRow, 9, 1, 6).setValues([[
      cantAuth, session.responsableNombre, now, costoVigente, valorSalida, nuevoEstado
    ]]);

    recalcularStockCompleto();
    return crearRespuesta(true, { idSolicitud: idSolicitud, estado: nuevoEstado }, 'Salida autorizada.');
  } finally {
    lock.releaseLock();
  }
}`,

    'Stock.gs': `/**
 * Control de Insumos - Cálculo de Stock y Costo Promedio Ponderado
 */
function obtenerStock(provinciaFiltro) {
  var ss = getSpreadsheet();
  var hIns = ss.getSheetByName(CONFIG.HOJAS.INSUMOS);
  var hIng = ss.getSheetByName(CONFIG.HOJAS.INGRESOS);
  var hSal = ss.getSheetByName(CONFIG.HOJAS.SALIDAS);

  if (!hIns) return [];
  var insData = hIns.getDataRange().getValues();
  var ingData = hIng ? hIng.getDataRange().getValues() : [];
  var salData = hSal ? hSal.getDataRange().getValues() : [];

  var ingresosMap = {};
  for (var i = 1; i < ingData.length; i++) {
    var k = String(ingData[i][3]).trim() + '_' + String(ingData[i][2]).trim().toLowerCase();
    if (!ingresosMap[k]) ingresosMap[k] = { cantidad: 0, valor: 0 };
    ingresosMap[k].cantidad += parseNumeroSeguro(ingData[i][5]);
    ingresosMap[k].valor += parseNumeroSeguro(ingData[i][7]);
  }

  var salidasMap = {};
  for (var s = 1; s < salData.length; s++) {
    var st = String(salData[s][13]).trim().toUpperCase();
    if (st === 'AUTORIZADO' || st === 'AUTORIZADO PARCIAL') {
      var ks = String(salData[s][4]).trim() + '_' + String(salData[s][2]).trim().toLowerCase();
      salidasMap[ks] = (salidasMap[ks] || 0) + parseNumeroSeguro(salData[s][8]);
    }
  }

  var items = [];
  for (var k = 1; k < insData.length; k++) {
    var row = insData[k];
    var prov = String(row[4]).trim();
    if (provinciaFiltro && prov.toLowerCase() !== String(provinciaFiltro).trim().toLowerCase()) continue;

    var id = String(row[0]).trim();
    var key = id + '_' + prov.toLowerCase();
    var ing = ingresosMap[key] || { cantidad: 0, valor: 0 };
    var salido = salidasMap[key] || 0;
    var stockActual = Math.max(0, ing.cantidad - salido);
    var costoProm = ing.cantidad > 0 ? (ing.valor / ing.cantidad) : 0;
    var stockMin = parseNumeroSeguro(row[5]);
    var stockObj = parseNumeroSeguro(row[6]);
    var reponer = stockActual <= stockMin ? Math.max(0, stockObj - stockActual) : 0;

    items.push({
      idInsumo: id,
      provincia: prov,
      categoria: String(row[1]),
      insumo: String(row[2]),
      unidad: String(row[3]),
      totalIngresado: ing.cantidad,
      totalSalido: salido,
      stockActual: stockActual,
      costoPromedio: Math.round(costoProm * 100) / 100,
      valorStock: Math.round(stockActual * costoProm * 100) / 100,
      stockMinimo: stockMin,
      stockObjetivo: stockObj,
      cantidadReponer: reponer,
      estado: stockActual <= stockMin ? 'CRITICO' : (stockActual <= stockMin * 1.3 ? 'CERCA_MINIMO' : 'SUFICIENTE'),
      activo: String(row[7]).trim()
    });
  }
  return items;
}`,
  };

  const handleCopyCode = () => {
    const code = codeFiles[selectedFile];
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)] text-[var(--accent-contrast)] flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)] uppercase tracking-tight font-sans">
                Conexión con Google Sheets & Apps Script
              </h2>
              <span className="text-xs text-[var(--text-muted)]">
                Backend liviano en Google Apps Script para sincronización directa de taller
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-surface)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Subnav */}
        <div className="flex border-b border-[var(--border-subtle)] px-6 bg-[var(--bg-surface-subtle)] gap-4 text-xs font-mono uppercase tracking-wider font-bold">
          <button
            onClick={() => setActiveTab('conexion')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'conexion'
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Estado de Conexión
          </button>
          <button
            onClick={() => setActiveTab('instrucciones')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'instrucciones'
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Pasos de Instalación
          </button>
          <button
            onClick={() => setActiveTab('codigo')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'codigo'
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Código Apps Script (.gs)
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-[var(--bg-surface)] text-[var(--text-secondary)]">
          {activeTab === 'conexion' && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                  URL de la Web App de Google Apps Script:
                </label>
                <div className="space-y-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full text-xs font-mono py-2.5 px-3 rounded-xl border border-[var(--border-input)] bg-[var(--bg-input)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] placeholder:text-[var(--text-muted)] shadow-xs"
                  />
                  <p className="text-[11px] text-[var(--text-muted)] font-mono">
                    Pegá la URL generada al hacer <strong>Implementar → Nueva implementación → Aplicación web</strong> en tu editor de Apps Script.
                  </p>
                </div>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl border text-xs font-mono flex items-start gap-2.5 ${
                    testResult.ok
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300'
                      : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300'
                  }`}
                >
                  {testResult.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={testing}
                  onClick={handleSaveAndTest}
                  className="py-2.5 px-4 bg-[var(--accent)] text-[var(--accent-contrast)] rounded-xl font-mono uppercase tracking-wider font-black text-xs hover:opacity-90 disabled:opacity-50 transition-colors shadow-md flex items-center gap-2"
                >
                  {testing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>Probando conexión...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Probar y Guardar Conexión</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUrlInput('');
                    api.setAppsScriptUrl('');
                    onConnectionChange();
                  }}
                  className="py-2.5 px-3 text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-xl hover:bg-[var(--bg-surface-subtle)] transition-colors shadow-xs"
                >
                  Usar Modo Local / Demostración
                </button>
              </div>

              <div className="pt-4 border-t border-[var(--border-subtle)] text-xs text-[var(--text-muted)] space-y-2">
                <div className="flex items-center justify-between">
                  <span>Datos de prueba actuales:</span>
                  <button
                    type="button"
                    onClick={handleResetData}
                    className="text-xs text-rose-600 dark:text-rose-400 font-mono font-semibold hover:underline"
                  >
                    Reiniciar catálogo y movimientos demo
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'instrucciones' && (
            <div className="space-y-4 text-xs text-[var(--text-secondary)] leading-relaxed font-sans">
              <div className="p-4 bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] rounded-xl space-y-1.5">
                <h4 className="font-bold text-[var(--text-primary)] text-sm">
                  1. Crear la planilla en Google Sheets
                </h4>
                <p className="text-[var(--text-muted)]">
                  Creá una planilla nueva en Google Sheets y andá a <strong>Extensiones → Apps Script</strong>.
                </p>
              </div>

              <div className="p-4 bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] rounded-xl space-y-1.5">
                <h4 className="font-bold text-[var(--text-primary)] text-sm">
                  2. Copiar los archivos .gs
                </h4>
                <p className="text-[var(--text-muted)]">
                  En la pestaña <strong>Código Apps Script</strong> de este diálogo, podés copiar cada uno de los archivos y pegarlos en el editor de Apps Script con el mismo nombre (Config.gs, Setup.gs, Api.gs, etc.).
                </p>
              </div>

              <div className="p-4 bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] rounded-xl space-y-1.5">
                <h4 className="font-bold text-[var(--text-primary)] text-sm">
                  3. Ejecutar setupSistemaInsumos()
                </h4>
                <p className="text-[var(--text-muted)]">
                  En Apps Script, seleccioná la función <code>setupSistemaInsumos</code> y hacé clic en <strong>Ejecutar</strong>. Esto creará automáticamente las 4 hojas requeridas (<strong>INSUMOS, INGRESOS, SALIDAS, STOCK</strong>) con sus encabezados y fila 1 congelada.
                </p>
              </div>

              <div className="p-4 bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] rounded-xl space-y-1.5">
                <h4 className="font-bold text-[var(--text-primary)] text-sm">
                  4. Desplegar como Web App
                </h4>
                <p className="text-[var(--text-muted)]">
                  Hacé clic en <strong>Implementar → Nueva implementación → Aplicación web</strong>.
                  <br />• <strong>Ejecutar como:</strong> Yo (tu cuenta).
                  <br />• <strong>Quién tiene acceso:</strong> Cualquier persona (Anyone).
                </p>
              </div>

              <div className="p-4 bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] rounded-xl space-y-1.5">
                <h4 className="font-bold text-[var(--text-primary)] text-sm">
                  5. Configurar PINs seguros
                </h4>
                <p className="text-[var(--text-muted)]">
                  En <strong>Configuración del proyecto</strong> (ícono de engranaje) → <strong>Propiedades de la secuencia de comandos</strong>, agregá la propiedad <code>RESPONSABLES_JSON</code> con el formato:
                  <code className="block bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--accent)] p-2 rounded mt-1.5 font-mono text-[11px]">
                    {`{"1423":"Marcelo Pereyra","7852":"Pablo Guantay","9021":"Nelson Albarracín"}`}
                  </code>
                </p>
              </div>
            </div>
          )}

          {activeTab === 'codigo' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {Object.keys(codeFiles).map((fname) => (
                    <button
                      key={fname}
                      onClick={() => setSelectedFile(fname)}
                      className={`px-3 py-1 text-xs font-mono font-medium rounded-lg whitespace-nowrap transition-colors ${
                        selectedFile === fname
                          ? 'bg-[var(--accent)] text-[var(--accent-contrast)] font-bold'
                          : 'bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)]'
                      }`}
                    >
                      {fname}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3 py-1 text-xs font-mono rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors flex items-center gap-1.5 shrink-0 shadow-xs"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar archivo</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-4 bg-slate-950 text-emerald-400 border border-slate-800 rounded-xl font-mono text-xs overflow-x-auto max-h-96 leading-relaxed">
                <code>{codeFiles[selectedFile]}</code>
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] flex items-center justify-end">
          <button
            onClick={onClose}
            className="py-1.5 px-4 bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-xl text-xs font-mono font-semibold hover:border-[var(--accent)] transition-colors shadow-xs"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
