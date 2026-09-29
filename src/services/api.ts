import {
  Insumo,
  Ingreso,
  Salida,
  StockItem,
  ApiResponse,
  AuthSession,
  MovimientoHistorial,
  EstadoStock,
  Colaborador,
} from '../types';
import {
  INITIAL_INSUMOS,
  INITIAL_INGRESOS,
  INITIAL_SALIDAS,
  DEMO_RESPONSABLES,
  COLABORADORES,
} from '../data/config';

const STORAGE_KEY_INSUMOS = 'ci_insumos_v1';
const STORAGE_KEY_INGRESOS = 'ci_ingresos_v1';
const STORAGE_KEY_SALIDAS = 'ci_salidas_v1';
const STORAGE_KEY_COLABORADORES = 'ci_colaboradores_v1';
const STORAGE_KEY_RECENT_COLABORADORES = 'ci_recent_colaboradores_v1';
const STORAGE_KEY_APPS_SCRIPT_URL = 'ci_apps_script_url';
const STORAGE_KEY_SESSION = 'ci_auth_session';
const PRODUCTION_API_URL =
  'https://script.google.com/macros/s/AKfycbwcdcy9SmmfloEJBB5Bp9EF398VzITWn2BPmNlG0BMoJw8D_rZRw9JFS10rQtxSoUbfYA/exec';

class ApiService {
  private appsScriptUrl: string = '';

  constructor() {
    this.appsScriptUrl =
      (import.meta.env.VITE_APPS_SCRIPT_URL as string) ||
      localStorage.getItem(STORAGE_KEY_APPS_SCRIPT_URL) ||
      PRODUCTION_API_URL;
    this.initLocalStorage();
  }

  public getAppsScriptUrl(): string {
    return this.appsScriptUrl;
  }

  public setAppsScriptUrl(url: string): void {
    this.appsScriptUrl = url.trim();
    if (this.appsScriptUrl) {
      localStorage.setItem(STORAGE_KEY_APPS_SCRIPT_URL, this.appsScriptUrl);
    } else {
      localStorage.removeItem(STORAGE_KEY_APPS_SCRIPT_URL);
    }
  }

  public isLiveConnected(): boolean {
    return !!this.appsScriptUrl && this.appsScriptUrl.startsWith('https://script.google.com');
  }

  private initLocalStorage(): void {
    if (!localStorage.getItem(STORAGE_KEY_INSUMOS)) {
      localStorage.setItem(STORAGE_KEY_INSUMOS, JSON.stringify(INITIAL_INSUMOS));
    }
    if (!localStorage.getItem(STORAGE_KEY_INGRESOS)) {
      localStorage.setItem(STORAGE_KEY_INGRESOS, JSON.stringify(INITIAL_INGRESOS));
    }
    if (!localStorage.getItem(STORAGE_KEY_SALIDAS)) {
      localStorage.setItem(STORAGE_KEY_SALIDAS, JSON.stringify(INITIAL_SALIDAS));
    }
    if (!localStorage.getItem(STORAGE_KEY_COLABORADORES)) {
      localStorage.setItem(STORAGE_KEY_COLABORADORES, JSON.stringify(COLABORADORES));
    }
  }

  private getStoredInsumos(): Insumo[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_INSUMOS);
      return data ? JSON.parse(data) : INITIAL_INSUMOS;
    } catch {
      return INITIAL_INSUMOS;
    }
  }

  private setStoredInsumos(items: Insumo[]): void {
    localStorage.setItem(STORAGE_KEY_INSUMOS, JSON.stringify(items));
  }

  private getStoredIngresos(): Ingreso[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_INGRESOS);
      let items: Ingreso[] = data ? JSON.parse(data) : INITIAL_INGRESOS;
      // Deduplicate IDs if any collision exists
      const seen = new Set<string>();
      let changed = false;
      items = items.map((item, idx) => {
        if (seen.has(item.idMovimiento)) {
          changed = true;
          const fixedId = `${item.idMovimiento}_${idx + 1}`;
          return { ...item, idMovimiento: fixedId };
        }
        seen.add(item.idMovimiento);
        return item;
      });
      if (changed) {
        this.setStoredIngresos(items);
      }
      return items;
    } catch {
      return INITIAL_INGRESOS;
    }
  }

  private setStoredIngresos(items: Ingreso[]): void {
    localStorage.setItem(STORAGE_KEY_INGRESOS, JSON.stringify(items));
  }

  private getStoredSalidas(): Salida[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_SALIDAS);
      let items: Salida[] = data ? JSON.parse(data) : INITIAL_SALIDAS;
      // Deduplicate IDs if any collision exists
      const seen = new Set<string>();
      let changed = false;
      items = items.map((item, idx) => {
        if (seen.has(item.idSolicitud)) {
          changed = true;
          const fixedId = `${item.idSolicitud}_${idx + 1}`;
          return { ...item, idSolicitud: fixedId };
        }
        seen.add(item.idSolicitud);
        return item;
      });
      if (changed) {
        this.setStoredSalidas(items);
      }
      return items;
    } catch {
      return INITIAL_SALIDAS;
    }
  }

  private setStoredSalidas(items: Salida[]): void {
    localStorage.setItem(STORAGE_KEY_SALIDAS, JSON.stringify(items));
  }

  private getNowJujuyString(): string {
    const now = new Date();
    // Format YYYY-MM-DD HH:mm:ss
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(
      now.getHours()
    )}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  }

  private getTodayCompact(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  }

  // ==========================================
  // APPS SCRIPT HTTP CALLER
  // ==========================================
  private async callAppsScript<T>(action: string, payload: any = {}): Promise<ApiResponse<T>> {
    if (!this.isLiveConnected()) {
      throw new Error('NO_APPS_SCRIPT_URL');
    }

    try {
      const bodyData = JSON.stringify({ action, ...payload });
      // Text/plain prevents CORS preflight in browsers for GAS Web Apps
      const response = await fetch(this.appsScriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: bodyData,
        redirect: 'follow',
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
      }

      const resJson: ApiResponse<T> = await response.json();
      return resJson;
    } catch (err: any) {
      console.error('Error comunicando con Google Apps Script:', err);
      return {
        ok: false,
        code: 'NETWORK_ERROR',
        message: 'No se pudo conectar con el servidor de Google Apps Script. Verificá tu conexión.',
        details: err?.message,
      };
    }
  }

  // ==========================================
  // AUTH (PIN & SESSIONS)
  // ==========================================
  public async validarPin(pin: string): Promise<ApiResponse<AuthSession>> {
    if (this.isLiveConnected()) {
      const res = await this.callAppsScript<AuthSession>('validarPin', { pin });
      if (res.ok && res.data) {
        this.saveSession(res.data);
      }
      return res;
    }

    // Local / Demo implementation
    const cleanPin = pin.trim();
    const responsableNombre = DEMO_RESPONSABLES[cleanPin];
    if (!responsableNombre) {
      return {
        ok: false,
        code: 'PIN_INVALIDO',
        message: 'PIN incorrecto. Acceso denegado.',
      };
    }

    const session: AuthSession = {
      token: `demo-token-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      responsableNombre,
      expiresAt: Date.now() + 25 * 60 * 1000, // 25 minutes
    };

    this.saveSession(session);
    return {
      ok: true,
      data: session,
      message: `Bienvenido/a, ${responsableNombre}`,
    };
  }

  public getSession(): AuthSession | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SESSION);
      if (!stored) return null;
      const session: AuthSession = JSON.parse(stored);
      if (Date.now() > session.expiresAt) {
        this.clearSession();
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }

  public saveSession(session: AuthSession): void {
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
  }

  public clearSession(): void {
    localStorage.removeItem(STORAGE_KEY_SESSION);
  }

  // ==========================================
  // INSUMOS
  // ==========================================
  public async getInsumos(provincia?: string): Promise<ApiResponse<Insumo[]>> {
    if (this.isLiveConnected()) {
      return await this.callAppsScript<Insumo[]>('getInsumos', { provincia });
    }

    let items = this.getStoredInsumos();
    if (provincia) {
      items = items.filter((i) => i.provincia.toLowerCase() === provincia.toLowerCase());
    }
    return {
      ok: true,
      data: items,
    };
  }

  public async guardarInsumo(item: Insumo, token: string): Promise<ApiResponse<Insumo>> {
    if (this.isLiveConnected()) return this.callAppsScript<Insumo>('guardarInsumo', { ...item, token });
    const items = this.getStoredInsumos();
    const index = items.findIndex((i) => i.id === item.id);
    const saved = { ...item, id: item.id || `INS-${String(items.length + 1).padStart(3, '0')}` };
    if (index >= 0) items[index] = saved; else items.push(saved);
    this.setStoredInsumos(items);
    return { ok: true, data: saved };
  }

  // ==========================================
  // COLABORADORES
  // ==========================================
  public async getColaboradores(provincia?: string): Promise<ApiResponse<Colaborador[]>> {
    if (this.isLiveConnected()) {
      const res = await this.callAppsScript<Colaborador[]>('getColaboradores', { provincia });
      if (res.ok && res.data && res.data.length > 0) {
        return res;
      }
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY_COLABORADORES);
      let items: Colaborador[] = raw ? JSON.parse(raw) : COLABORADORES;
      if (provincia) {
        items = items.filter(
          (c) => c.provincia.toLowerCase() === provincia.toLowerCase()
        );
      }
      return { ok: true, data: items };
    } catch {
      return { ok: true, data: COLABORADORES };
    }
  }

  public async guardarColaborador(colab: Colaborador, token: string, nombreOriginal = ''): Promise<ApiResponse<Colaborador>> {
    if (this.isLiveConnected()) return this.callAppsScript<Colaborador>('guardarColaborador', { ...colab, nombreOriginal, activo: 'Sí', token });
    this.saveColaborador(colab);
    return { ok: true, data: colab };
  }

  public getRecentColaboradores(provincia?: string): Colaborador[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_RECENT_COLABORADORES);
      if (!raw) return [];
      let list: Colaborador[] = JSON.parse(raw);
      if (provincia) {
        list = list.filter(
          (c) => c.provincia.toLowerCase() === provincia.toLowerCase()
        );
      }
      return list.slice(0, 4);
    } catch {
      return [];
    }
  }

  public recordRecentColaborador(colab: Colaborador): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_RECENT_COLABORADORES);
      let list: Colaborador[] = raw ? JSON.parse(raw) : [];
      // Remove if exists to bring to top
      list = list.filter((c) => c.nombre.toLowerCase() !== colab.nombre.toLowerCase());
      list.unshift(colab);
      localStorage.setItem(STORAGE_KEY_RECENT_COLABORADORES, JSON.stringify(list.slice(0, 8)));
    } catch {
      // ignore
    }
  }

  public saveColaborador(colab: Colaborador): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_COLABORADORES);
      let list: Colaborador[] = raw ? JSON.parse(raw) : COLABORADORES;
      const exists = list.some(
        (c) =>
          c.nombre.toLowerCase() === colab.nombre.toLowerCase() &&
          c.provincia.toLowerCase() === colab.provincia.toLowerCase()
      );
      if (!exists) {
        list.push(colab);
        localStorage.setItem(STORAGE_KEY_COLABORADORES, JSON.stringify(list));
      }
    } catch {
      // ignore
    }
  }

  // ==========================================
  // STOCK CALCULATION (Weighted Average Cost)
  // ==========================================
  public async getStock(provincia?: string): Promise<ApiResponse<StockItem[]>> {
    if (this.isLiveConnected()) {
      return await this.callAppsScript<StockItem[]>('getStock', { provincia });
    }

    const insumos = this.getStoredInsumos();
    const ingresos = this.getStoredIngresos();
    const salidas = this.getStoredSalidas();

    const stockItems: StockItem[] = [];

    const filteredInsumos = provincia
      ? insumos.filter((i) => i.provincia.toLowerCase() === provincia.toLowerCase())
      : insumos;

    for (const ins of filteredInsumos) {
      // 1. Calculate Ingresos totals for this item in this province
      const itemIngresos = ingresos.filter(
        (ing) =>
          ing.idInsumo === ins.id &&
          ing.provincia.toLowerCase() === ins.provincia.toLowerCase()
      );

      const totalIngresado = itemIngresos.reduce((sum, item) => sum + item.cantidad, 0);
      const totalValorIngresado = itemIngresos.reduce((sum, item) => sum + item.total, 0);

      // Costo Promedio Ponderado
      const costoPromedio =
        totalIngresado > 0 ? Math.round((totalValorIngresado / totalIngresado) * 100) / 100 : 0;

      // 2. Calculate Salidas autorizadas
      // Rules: Only AUTORIZADO and AUTORIZADO PARCIAL discount stock!
      // PENDIENTE, RECHAZADO and CANCELADO do NOT discount.
      const itemSalidasValidas = salidas.filter(
        (sal) =>
          sal.idInsumo === ins.id &&
          sal.provincia.toLowerCase() === ins.provincia.toLowerCase() &&
          (sal.estado === 'AUTORIZADO' || sal.estado === 'AUTORIZADO PARCIAL')
      );

      const totalSalido = itemSalidasValidas.reduce(
        (sum, item) => sum + item.cantidadAutorizada,
        0
      );

      // Stock Actual
      const stockActual = Math.max(0, totalIngresado - totalSalido);
      const valorStock = Math.round(stockActual * costoPromedio * 100) / 100;

      // Cantidad a reponer (Stock Objetivo - Stock Actual if Stock Actual <= Stock Mínimo)
      let cantidadReponer = 0;
      if (stockActual <= ins.stockMinimo) {
        cantidadReponer = Math.max(0, ins.stockObjetivo - stockActual);
      }

      // Estado visual
      let estado: EstadoStock = 'SUFICIENTE';
      if (stockActual <= ins.stockMinimo) {
        estado = 'CRITICO';
      } else if (stockActual <= ins.stockMinimo * 1.3) {
        // Within 30% above minimum
        estado = 'CERCA_MINIMO';
      }

      stockItems.push({
        idInsumo: ins.id,
        provincia: ins.provincia,
        categoria: ins.categoria,
        insumo: ins.insumo,
        unidad: ins.unidad,
        totalIngresado,
        totalSalido,
        stockActual,
        costoPromedio,
        valorStock,
        stockMinimo: ins.stockMinimo,
        stockObjetivo: ins.stockObjetivo,
        cantidadReponer,
        estado,
      });
    }

    return {
      ok: true,
      data: stockItems,
    };
  }

  // ==========================================
  // SOLICITUDES (COLABORADOR)
  // ==========================================
  public async crearSolicitud(payload: {
    provincia: string;
    sector: string;
    idInsumo: string;
    solicitante: string;
    cantidadSolicitada: number;
    observaciones?: string;
  }): Promise<ApiResponse<Salida>> {
    // Basic sanitization & validations
    const cantidad = Number(payload.cantidadSolicitada);
    if (isNaN(cantidad) || cantidad <= 0) {
      return {
        ok: false,
        code: 'CANTIDAD_INVALIDA',
        message: 'La cantidad solicitada debe ser mayor a 0.',
      };
    }

    if (!payload.provincia || !payload.sector || !payload.idInsumo || !payload.solicitante) {
      return {
        ok: false,
        code: 'CAMPOS_REQUERIDOS',
        message: 'Por favor complete todos los campos obligatorios.',
      };
    }

    if (this.isLiveConnected()) {
      return await this.callAppsScript<Salida>('crearSolicitud', {
        ...payload,
        cantidadSolicitada: cantidad,
      });
    }

    // Local / Demo validation
    const insumos = this.getStoredInsumos();
    const insumoItem = insumos.find(
      (i) => i.id === payload.idInsumo && i.provincia === payload.provincia
    );

    if (!insumoItem || insumoItem.activo !== 'Sí') {
      return {
        ok: false,
        code: 'INSUMO_INACTIVO',
        message: 'El insumo seleccionado no existe o no se encuentra activo.',
      };
    }

    // Check available stock
    const stockRes = await this.getStock(payload.provincia);
    const stockObj = stockRes.data?.find((s) => s.idInsumo === payload.idInsumo);
    const stockActual = stockObj ? stockObj.stockActual : 0;

    if (cantidad > stockActual) {
      return {
        ok: false,
        code: 'STOCK_INSUFICIENTE',
        message: 'CANTIDAD NO DISPONIBLE',
        details: {
          solicitado: cantidad,
          stockActual: stockActual,
          maximoDisponible: stockActual,
        },
      };
    }

    const salidas = this.getStoredSalidas();
    const pattern = `SAL-${this.getTodayCompact()}-`;
    let maxSeq = 0;
    for (const s of salidas) {
      if (s.idSolicitud.startsWith(pattern)) {
        const seqPart = parseInt(s.idSolicitud.substring(pattern.length), 10);
        if (!isNaN(seqPart) && seqPart > maxSeq) {
          maxSeq = seqPart;
        }
      }
    }
    let nextSeq = maxSeq + 1;
    let newId = `${pattern}${nextSeq.toString().padStart(5, '0')}`;
    while (salidas.some((s) => s.idSolicitud === newId)) {
      nextSeq++;
      newId = `${pattern}${nextSeq.toString().padStart(5, '0')}`;
    }

    const nuevaSalida: Salida = {
      idSolicitud: newId,
      fechaHoraSolicitud: this.getNowJujuyString(),
      provincia: payload.provincia,
      sector: payload.sector,
      idInsumo: payload.idInsumo,
      insumo: insumoItem.insumo,
      solicitante: payload.solicitante,
      cantidadSolicitada: cantidad,
      cantidadAutorizada: 0,
      autorizadoPor: '',
      fechaHoraAutorizacion: '',
      costoUnitario: 0,
      valorSalida: 0,
      estado: 'PENDIENTE',
      observaciones: (payload.observaciones || '').trim(),
      motivoRechazo: '',
    };

    salidas.unshift(nuevaSalida);
    this.setStoredSalidas(salidas);

    this.recordRecentColaborador({
      nombre: payload.solicitante,
      sector: payload.sector,
      provincia: payload.provincia,
    });
    this.saveColaborador({
      nombre: payload.solicitante,
      sector: payload.sector,
      provincia: payload.provincia,
    });

    return {
      ok: true,
      data: nuevaSalida,
      message: 'Solicitud registrada correctamente. Pendiente de autorización.',
    };
  }

  // Alias for backward compatibility
  public async solicitarInsumo(payload: {
    provincia: string;
    sector: string;
    idInsumo: string;
    solicitante: string;
    cantidadSolicitada: number;
    observaciones?: string;
  }): Promise<ApiResponse<Salida>> {
    return this.crearSolicitud(payload);
  }

  // ==========================================
  // AUTORIZACIONES (RESPONSABLE)
  // ==========================================
  public async getSolicitudesPendientes(provincia?: string): Promise<ApiResponse<Salida[]>> {
    if (this.isLiveConnected()) {
      return await this.callAppsScript<Salida[]>('getSolicitudesPendientes', { provincia });
    }

    const salidas = this.getStoredSalidas();
    let pendientes = salidas.filter((s) => s.estado === 'PENDIENTE');
    if (provincia) {
      pendientes = pendientes.filter((s) => s.provincia.toLowerCase() === provincia.toLowerCase());
    }

    // Oldest first as required: "Ordenar las solicitudes: más antiguas primero."
    pendientes.sort((a, b) => a.fechaHoraSolicitud.localeCompare(b.fechaHoraSolicitud));

    return {
      ok: true,
      data: pendientes,
    };
  }

  public async autorizarSolicitud(
    idSolicitud: string,
    cantidadAutorizar: number,
    token: string
  ): Promise<ApiResponse<Salida>> {
    const cantAuth = Number(cantidadAutorizar);
    if (isNaN(cantAuth) || cantAuth <= 0) {
      return {
        ok: false,
        code: 'CANTIDAD_INVALIDA',
        message: 'La cantidad a autorizar debe ser mayor a 0.',
      };
    }

    if (this.isLiveConnected()) {
      return await this.callAppsScript<Salida>('autorizarSolicitud', {
        idSolicitud,
        cantidadAutorizada: cantAuth,
        token,
      });
    }

    // Local / Demo implementation
    const session = this.getSession();
    if (!session || session.token !== token) {
      return {
        ok: false,
        code: 'SESION_EXPIRADA',
        message: 'Sesión expirada o inválida. Ingrese el PIN de responsable nuevamente.',
      };
    }

    const salidas = this.getStoredSalidas();
    const salidaIndex = salidas.findIndex((s) => s.idSolicitud === idSolicitud);

    if (salidaIndex === -1) {
      return {
        ok: false,
        code: 'NO_ENCONTRADA',
        message: 'La solicitud no existe en el sistema.',
      };
    }

    const solicitud = salidas[salidaIndex];

    // Case 6 check: Solicitud ya autorizada o cerrada
    if (solicitud.estado !== 'PENDIENTE') {
      return {
        ok: false,
        code: 'ESTADO_INVALIDO',
        message: `La solicitud ya fue procesada anteriormente con estado: ${solicitud.estado}.`,
      };
    }

    if (cantAuth > solicitud.cantidadSolicitada) {
      return {
        ok: false,
        code: 'EXCEDE_SOLICITADO',
        message: `No se puede autorizar más de la cantidad solicitada (${solicitud.cantidadSolicitada}).`,
      };
    }

    // Case 4 Concurrency check: verify live stock at this exact instant!
    const stockRes = await this.getStock(solicitud.provincia);
    const stockObj = stockRes.data?.find((s) => s.idInsumo === solicitud.idInsumo);
    const stockActual = stockObj ? stockObj.stockActual : 0;
    const costoVigente = stockObj ? stockObj.costoPromedio : 0;

    if (cantAuth > stockActual) {
      return {
        ok: false,
        code: 'STOCK_INSUFICIENTE',
        message: `STOCK INSUFICIENTE. Disponible actualmente: ${stockActual} ${stockObj?.unidad || 'unidades'}. No se pueden autorizar ${cantAuth}.`,
        details: {
          stockActual,
          cantidadRequerida: cantAuth,
        },
      };
    }

    const nuevoEstado =
      cantAuth === solicitud.cantidadSolicitada ? 'AUTORIZADO' : 'AUTORIZADO PARCIAL';

    const updatedSalida: Salida = {
      ...solicitud,
      cantidadAutorizada: cantAuth,
      autorizadoPor: session.responsableNombre,
      fechaHoraAutorizacion: this.getNowJujuyString(),
      costoUnitario: costoVigente,
      valorSalida: Math.round(cantAuth * costoVigente * 100) / 100,
      estado: nuevoEstado,
    };

    salidas[salidaIndex] = updatedSalida;
    this.setStoredSalidas(salidas);

    return {
      ok: true,
      data: updatedSalida,
      message: `Salida ${nuevoEstado === 'AUTORIZADO' ? 'autorizada' : 'autorizada parcialmente'} por ${session.responsableNombre}.`,
      details: {
        insumo: updatedSalida.insumo,
        cantidadSolicitada: updatedSalida.cantidadSolicitada,
        cantidadAutorizada: cantAuth,
        stockAnterior: stockActual,
        stockActual: stockActual - cantAuth,
      },
    };
  }

  // Alias for backward compatibility
  public async autorizarSalida(
    idSolicitud: string,
    cantidadAutorizar: number,
    token: string
  ): Promise<ApiResponse<Salida>> {
    return this.autorizarSolicitud(idSolicitud, cantidadAutorizar, token);
  }

  public async rechazarSolicitud(
    idSolicitud: string,
    motivoRechazo: string,
    token: string
  ): Promise<ApiResponse<Salida>> {
    if (this.isLiveConnected()) {
      return await this.callAppsScript<Salida>('rechazarSolicitud', {
        idSolicitud,
        motivoRechazo,
        token,
      });
    }

    const session = this.getSession();
    if (!session || session.token !== token) {
      return {
        ok: false,
        code: 'SESION_EXPIRADA',
        message: 'Sesión expirada o inválida. Ingrese el PIN de responsable nuevamente.',
      };
    }

    const salidas = this.getStoredSalidas();
    const salidaIndex = salidas.findIndex((s) => s.idSolicitud === idSolicitud);

    if (salidaIndex === -1) {
      return {
        ok: false,
        code: 'NO_ENCONTRADA',
        message: 'La solicitud no existe en el sistema.',
      };
    }

    const solicitud = salidas[salidaIndex];
    if (solicitud.estado !== 'PENDIENTE') {
      return {
        ok: false,
        code: 'ESTADO_INVALIDO',
        message: `La solicitud ya no está pendiente (estado actual: ${solicitud.estado}).`,
      };
    }

    const updatedSalida: Salida = {
      ...solicitud,
      cantidadAutorizada: 0,
      autorizadoPor: session.responsableNombre,
      fechaHoraAutorizacion: this.getNowJujuyString(),
      estado: 'RECHAZADO',
      motivoRechazo: (motivoRechazo || '').trim(),
    };

    salidas[salidaIndex] = updatedSalida;
    this.setStoredSalidas(salidas);

    return {
      ok: true,
      data: updatedSalida,
      message: 'Solicitud rechazada.',
    };
  }

  // ==========================================
  // INGRESOS (RESPONSABLE)
  // ==========================================
  public async registrarIngreso(
    payload: {
      provincia: string;
      idInsumo: string;
      cantidad: number;
      precioUnitario: number;
      proveedor: string;
      tipoIngreso: Ingreso['tipoIngreso'];
      comprobante?: string;
      observaciones?: string;
    },
    token: string
  ): Promise<ApiResponse<Ingreso>> {
    const cantidad = Number(payload.cantidad);
    const precio = Number(payload.precioUnitario);

    if (isNaN(cantidad) || cantidad <= 0) {
      return {
        ok: false,
        code: 'CANTIDAD_INVALIDA',
        message: 'La cantidad debe ser mayor a 0.',
      };
    }

    if (isNaN(precio) || precio < 0) {
      return {
        ok: false,
        code: 'PRECIO_INVALIDO',
        message: 'El precio unitario no puede ser negativo.',
      };
    }

    if (this.isLiveConnected()) {
      return await this.callAppsScript<Ingreso>('registrarIngreso', {
        ...payload,
        cantidad,
        precioUnitario: precio,
        token,
      });
    }

    const session = this.getSession();
    if (!session || session.token !== token) {
      return {
        ok: false,
        code: 'SESION_EXPIRADA',
        message: 'Sesión expirada o inválida. Ingrese el PIN nuevamente.',
      };
    }

    const insumos = this.getStoredInsumos();
    const insumoItem = insumos.find(
      (i) => i.id === payload.idInsumo && i.provincia === payload.provincia
    );

    if (!insumoItem) {
      return {
        ok: false,
        code: 'INSUMO_NO_ENCONTRADO',
        message: 'El insumo seleccionado no fue encontrado para esta provincia.',
      };
    }

    const ingresos = this.getStoredIngresos();
    const pattern = `ING-${this.getTodayCompact()}-`;
    let maxSeq = 0;
    for (const i of ingresos) {
      if (i.idMovimiento.startsWith(pattern)) {
        const seqPart = parseInt(i.idMovimiento.substring(pattern.length), 10);
        if (!isNaN(seqPart) && seqPart > maxSeq) {
          maxSeq = seqPart;
        }
      }
    }
    let nextSeq = maxSeq + 1;
    let newId = `${pattern}${nextSeq.toString().padStart(5, '0')}`;
    while (ingresos.some((i) => i.idMovimiento === newId)) {
      nextSeq++;
      newId = `${pattern}${nextSeq.toString().padStart(5, '0')}`;
    }
    const total = Math.round(cantidad * precio * 100) / 100;

    const nuevoIngreso: Ingreso = {
      idMovimiento: newId,
      fechaHora: this.getNowJujuyString(),
      provincia: payload.provincia,
      idInsumo: payload.idInsumo,
      insumo: insumoItem.insumo,
      cantidad,
      precioUnitario: precio,
      total,
      proveedor: (payload.proveedor || '').trim(),
      tipoIngreso: payload.tipoIngreso || 'Compra',
      comprobante: (payload.comprobante || '').trim(),
      responsable: session.responsableNombre,
      observaciones: (payload.observaciones || '').trim(),
    };

    ingresos.unshift(nuevoIngreso);
    this.setStoredIngresos(ingresos);

    return {
      ok: true,
      data: nuevoIngreso,
      message: `Ingreso registrado exitosamente. Total: $ ${total.toLocaleString('es-AR')}`,
    };
  }

  // ==========================================
  // HISTORIAL Y PROVEEDORES
  // ==========================================
  public async getUltimosMovimientos(limit = 20): Promise<ApiResponse<MovimientoHistorial[]>> {
    if (this.isLiveConnected()) {
      return await this.callAppsScript<MovimientoHistorial[]>('getUltimosMovimientos', { limit });
    }

    const insumos = this.getStoredInsumos();
    const insumosMap = new Map(insumos.map((i) => [i.id + '_' + i.provincia, i.unidad]));

    const ingresos = this.getStoredIngresos();
    const salidas = this.getStoredSalidas();

    const movimientos: MovimientoHistorial[] = [];

    // Map ingresos
    for (const ing of ingresos) {
      const unidad = insumosMap.get(ing.idInsumo + '_' + ing.provincia) || 'u';
      movimientos.push({
        id: ing.idMovimiento,
        fechaHora: ing.fechaHora,
        tipo: 'INGRESO',
        insumo: ing.insumo,
        unidad,
        provincia: ing.provincia,
        cantidad: ing.cantidad,
        persona: ing.responsable,
        sectorOProveedor: ing.proveedor ? `${ing.proveedor} (${ing.tipoIngreso})` : ing.tipoIngreso,
        estado: 'REGISTRADO',
        monto: ing.total,
      });
    }

    // Map salidas
    for (const sal of salidas) {
      const unidad = insumosMap.get(sal.idInsumo + '_' + sal.provincia) || 'u';
      movimientos.push({
        id: sal.idSolicitud,
        fechaHora: sal.fechaHoraAutorizacion || sal.fechaHoraSolicitud,
        tipo: 'SALIDA',
        insumo: sal.insumo,
        unidad,
        provincia: sal.provincia,
        cantidad: sal.cantidadAutorizada || sal.cantidadSolicitada,
        solicitado: sal.cantidadSolicitada,
        persona: sal.solicitante + (sal.autorizadoPor ? ` (Aut: ${sal.autorizadoPor})` : ''),
        sectorOProveedor: sal.sector,
        estado: sal.estado,
        monto: sal.valorSalida || 0,
      });
    }

    // Sort descending by date
    movimientos.sort((a, b) => b.fechaHora.localeCompare(a.fechaHora));

    return {
      ok: true,
      data: movimientos.slice(0, limit),
    };
  }

  public async getProveedoresSugeridos(): Promise<string[]> {
    if (this.isLiveConnected()) {
      const res = await this.callAppsScript<string[]>('getProveedoresSugeridos');
      if (res.ok && res.data) return res.data;
    }

    const ingresos = this.getStoredIngresos();
    const provs = new Set<string>();
    for (const ing of ingresos) {
      if (ing.proveedor && ing.proveedor.trim()) {
        provs.add(ing.proveedor.trim());
      }
    }
    return Array.from(provs);
  }

  // ==========================================
  // RESET / RECALCULAR STOCK COMPLETO
  // ==========================================
  public async recalcularStockCompleto(): Promise<ApiResponse<{ actualizados: number }>> {
    if (this.isLiveConnected()) {
      return await this.callAppsScript<{ actualizados: number }>('recalcularStockCompleto');
    }

    // In local demo, the getStock function dynamically derives exact stock from Ingresos & Salidas
    const insumos = this.getStoredInsumos();
    return {
      ok: true,
      data: { actualizados: insumos.length },
      message: `Stock recalculado con éxito para ${insumos.length} insumos según ingresos y salidas válidas.`,
    };
  }

  public async limpiarMovimientosDePrueba(): Promise<ApiResponse<{ message: string }>> {
    // Si está conectado a Apps Script, ejecutar la limpieza remota en la planilla Google Sheets
    if (this.isLiveConnected()) {
      return await this.callAppsScript<{ message: string }>('limpiarMovimientosDePrueba');
    }

    // Limpieza local
    const idsPruebaIngresos = [
      'ING-20260920-00001',
      'ING-20260921-00002',
      'ING-20260922-00003',
      'ING-20260925-00004',
    ];
    const compsPrueba = [
      'FAC-A-0001-00084321',
      'FAC-B-0003-00012903',
      'FAC-A-0002-00045129',
      'FAC-A-0001-00084550',
    ];
    const idsPruebaSalidas = ['SAL-20260927-00001', 'SAL-20260929-00001', 'SAL-20260929-00002'];

    const ingresos = this.getStoredIngresos().filter(
      (i) => !idsPruebaIngresos.includes(i.idMovimiento) && !compsPrueba.includes(i.comprobante)
    );
    this.setStoredIngresos(ingresos);

    const salidas = this.getStoredSalidas().filter((s) => !idsPruebaSalidas.includes(s.idSolicitud));
    this.setStoredSalidas(salidas);

    return {
      ok: true,
      message: 'Movimientos de prueba eliminados exitosamente.',
    };
  }

  public resetDemoData(): void {
    localStorage.removeItem(STORAGE_KEY_INSUMOS);
    localStorage.removeItem(STORAGE_KEY_INGRESOS);
    localStorage.removeItem(STORAGE_KEY_SALIDAS);
    this.initLocalStorage();
  }

  public async testConnection(
    url: string
  ): Promise<{ ok: boolean; message: string; details?: any }> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ action: 'ping' }),
        redirect: 'follow',
      });

      if (!response.ok) {
        return {
          ok: false,
          message: `El servidor respondió con código ${response.status}: ${response.statusText}`,
        };
      }

      const res = await response.json();
      if (res.ok) {
        return {
          ok: true,
          message:
            res.message || '¡Conexión establecida correctamente con Google Apps Script y Sheets!',
          details: res.data,
        };
      } else {
        return {
          ok: false,
          message: res.message || 'Respuesta no exitosa de Apps Script.',
        };
      }
    } catch (err: any) {
      return {
        ok: false,
        message:
          'Error al conectar: Verificá que la Web App esté desplegada con acceso "Cualquier persona" (Anyone). ' +
          (err?.message || ''),
      };
    }
  }
}

export const api = new ApiService();
