/**
 * Control de Insumos - Autenticación con PIN y Gestión de Sesiones
 */

/**
 * Valida el PIN ingresado por el responsable
 * @param {string} pin
 * @returns {Object} Respuesta con token de sesión y nombre del responsable
 */
function validarPinResponsable(pin) {
  if (!pin || String(pin).trim() === '') {
    return crearRespuesta(false, null, 'El PIN no puede estar vacío.', 'PIN_VACIO');
  }

  var cleanPin = String(pin).trim();
  var mapaResponsables = getResponsablesMap();

  var responsable = mapaResponsables[cleanPin];
  if (!responsable) {
    return crearRespuesta(false, null, 'PIN incorrecto. Acceso denegado.', 'PIN_INVALIDO');
  }
  // Los valores antiguos en formato texto siguen funcionando sin restricción.
  var nombre = typeof responsable === 'string' ? responsable : String(responsable.nombre || '').trim();
  var provincia = typeof responsable === 'string' ? '' : String(responsable.provincia || '').trim();
  if (!nombre || (provincia && CONFIG.PROVINCIAS.indexOf(provincia) === -1)) {
    return crearRespuesta(false, null, 'Configuración del PIN inválida.', 'PIN_CONFIG_INVALIDA');
  }

  // Generar token de sesión único y efímero
  var token = 'tok_' + Utilities.getUuid().replace(/-/g, '') + '_' + Date.now();
  var duracionSeg = CONFIG.DURACION_SESION_SEG || 1800; // 30 minutos

  // Guardar en CacheService de Apps Script
  var cache = CacheService.getScriptCache();
  var sessionData = JSON.stringify({
    responsableNombre: nombre,
    provincia: provincia,
    creadoEn: Date.now(),
    expiraEn: Date.now() + (duracionSeg * 1000)
  });

  cache.put(token, sessionData, duracionSeg);

  return crearRespuesta(true, {
    token: token,
    responsableNombre: nombre,
    provincia: provincia,
    expiresAt: Date.now() + (duracionSeg * 1000)
  }, 'PIN validado correctamente. Bienvenido/a ' + nombre);
}

function sesionPuedeOperarProvincia(session, provincia) {
  return !!session && (!session.provincia ||
    String(session.provincia).toLowerCase() === String(provincia || '').trim().toLowerCase());
}

/**
 * Verifica si un token de sesión es válido
 * @param {string} token
 * @returns {Object|null} Datos de la sesión o null si es inválido
 */
function verificarSesion(token) {
  if (!token) return null;
  var cache = CacheService.getScriptCache();
  var data = cache.get(token);
  if (!data) return null;

  try {
    var parsed = JSON.parse(data);
    if (Date.now() > parsed.expiraEn) {
      cache.remove(token);
      return null;
    }
    // Al activar PINs por base, invalida sesiones anteriores sin provincia.
    if (!parsed.provincia) {
      var responsables = getResponsablesMap();
      for (var pin in responsables) {
        if (typeof responsables[pin] === 'object') {
          cache.remove(token);
          return null;
        }
      }
    }
    return parsed;
  } catch (e) {
    return null;
  }
}

