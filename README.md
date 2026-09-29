# Control de Insumos — Autosol

Aplicación web para solicitar, autorizar y registrar movimientos de insumos.

## Desarrollo

1. Ejecutar `npm install`.
2. Copiar `.env.example` a `.env.local` y completar `VITE_APPS_SCRIPT_URL`.
3. Ejecutar `npm run dev`.

## Publicación en Netlify

Configurar `VITE_APPS_SCRIPT_URL` en **Site configuration → Environment variables** y publicar con `npm run build`. La conexión y la planilla no aparecen en la interfaz del usuario.
