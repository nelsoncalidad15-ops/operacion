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

  // Los PINs se configuran exclusivamente en Script Properties.
  PINS_POR_DEFECTO: {}
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
  var raw = PropertiesService.getScriptProperties().getProperty('RESPONSABLES_JSON');
  if (!raw) return CONFIG.PINS_POR_DEFECTO;
  try {
    var responsables = JSON.parse(raw);
    return responsables && typeof responsables === 'object' && !Array.isArray(responsables) ? responsables : {};
  } catch (e) {
    console.warn('Error leyendo RESPONSABLES_JSON de Script Properties: ' + e.message);
    return {};
  }
}

