const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('cada PIN obtiene su base y no puede operar en la otra', () => {
  const sessions = new Map();
  let uuid = 0;
  const property = JSON.stringify({
    '111111': { nombre: 'Responsable Jujuy', provincia: 'Jujuy' },
    '222222': { nombre: 'Responsable Salta', provincia: 'Salta' },
  });
  const context = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: (key) => key === 'RESPONSABLES_JSON' ? property : null }) },
    CacheService: { getScriptCache: () => ({ put: (key, value) => sessions.set(key, value), get: (key) => sessions.get(key), remove: (key) => sessions.delete(key) }) },
    Utilities: { getUuid: () => `test-uuid-${++uuid}` },
    crearRespuesta: (ok, data, message, code) => ({ ok, data, message, code }),
    console,
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('apps-script/Config.gs', 'utf8'), context);
  vm.runInContext(fs.readFileSync('apps-script/Auth.gs', 'utf8'), context);

  const jujuy = context.validarPinResponsable('111111');
  const salta = context.validarPinResponsable('222222');
  assert.equal(jujuy.data.provincia, 'Jujuy');
  assert.equal(salta.data.provincia, 'Salta');
  assert.equal(context.sesionPuedeOperarProvincia(context.verificarSesion(jujuy.data.token), 'Salta'), false);
  assert.equal(context.sesionPuedeOperarProvincia(context.verificarSesion(salta.data.token), 'Jujuy'), false);
  assert.equal(context.sesionPuedeOperarProvincia(context.verificarSesion(salta.data.token), 'Salta'), true);
  assert.equal(context.validarPinResponsable('1423').ok, false);
});

