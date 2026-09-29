/**
 * Control de Insumos - Configuración General
 * Apps Script Backend
 */

var CONFIG = {
  // Nombres de las cuatro hojas del sistema
  HOJAS: {
    INSUMOS: 'INSUMOS',
    INGRESOS: 'INGRESOS',
    SALIDAS: 'SALIDAS',
    STOCK: 'STOCK'
  },

  // Zona horaria de la empresa
  TIMEZONE: 'America/Argentina/Jujuy',

  // Provincias habilitadas
  PROVINCIAS: ['Jujuy', 'Salta'],

  // Sectores de la empresa
  SECTORES: [
    'Taller',
    'Lavadero',
    'Repuestos',
    'Administración',
    'Ventas',
    'Calidad',
    'Logística',
    'Mantenimiento'
  ],

  // Lista base de Colaboradores
  COLABORADORES: [
    { nombre: 'Mauro Gutiérrez', sector: 'Taller', provincia: 'Jujuy' },
    { nombre: 'Carlos Quispe', sector: 'Taller', provincia: 'Jujuy' },
    { nombre: 'Esteban Martínez', sector: 'Lavadero', provincia: 'Jujuy' },
    { nombre: 'Franco Alarcón', sector: 'Lavadero', provincia: 'Jujuy' },
    { nombre: 'María Elena Morales', sector: 'Repuestos', provincia: 'Jujuy' },
    { nombre: 'Luciana Farfán', sector: 'Administración', provincia: 'Jujuy' },
    { nombre: 'Gonzalo Burgos', sector: 'Ventas', provincia: 'Jujuy' },
    { nombre: 'Nelson Albarracín', sector: 'Calidad', provincia: 'Jujuy' },
    { nombre: 'Jorge Mamani', sector: 'Mantenimiento', provincia: 'Jujuy' },
    { nombre: 'Nicolás Cruz', sector: 'Logística', provincia: 'Jujuy' },
    { nombre: 'Gustavo Benítez', sector: 'Taller', provincia: 'Salta' },
    { nombre: 'Matías Villalba', sector: 'Lavadero', provincia: 'Salta' },
    { nombre: 'Ramiro Figueroa', sector: 'Repuestos', provincia: 'Salta' },
    { nombre: 'Carla Vaca', sector: 'Administración', provincia: 'Salta' },
    { nombre: 'Pablo Guantay', sector: 'Calidad', provincia: 'Salta' },
    { nombre: 'Diego Saravia', sector: 'Mantenimiento', provincia: 'Salta' }
  ],

  // Duración de la sesión de responsable (en segundos) para CacheService
  DURACION_SESION_SEG: 1800, // 30 minutos

  // PINs por defecto (se recomienda configurar en Script Properties)
  // Formato: PIN -> Nombre del Responsable
  PINS_POR_DEFECTO: {
    '1423': 'Marcelo Pereyra',
    '7852': 'Pablo Guantay',
    '9021': 'Nelson Albarracín'
  }
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
  try {
    var raw = PropertiesService.getScriptProperties().getProperty('RESPONSABLES_JSON');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error leyendo RESPONSABLES_JSON de Script Properties: ' + e.message);
  }
  return CONFIG.PINS_POR_DEFECTO;
}
