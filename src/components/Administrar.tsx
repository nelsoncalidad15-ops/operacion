import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Package, Users } from 'lucide-react';
import { AuthSession, Colaborador, Insumo } from '../types';
import { PROVINCIAS, SECTORES } from '../data/config';
import { api } from '../services/api';

const emptyItem: Insumo = { id: '', categoria: '', insumo: '', unidad: 'Unidades', provincia: 'Jujuy', stockMinimo: 0, stockObjetivo: 0, activo: 'Sí' };
const emptyPerson: Colaborador = { nombre: '', sector: 'Taller', provincia: 'Jujuy' };

export function Administrar({ session }: { session: AuthSession }) {
  const [section, setSection] = useState<'insumos' | 'personas'>('insumos');
  const [items, setItems] = useState<Insumo[]>([]);
  const [people, setPeople] = useState<Colaborador[]>([]);
  const [item, setItem] = useState<Insumo>(emptyItem);
  const [person, setPerson] = useState<Colaborador>(emptyPerson);
  const [originalName, setOriginalName] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [a, b] = await Promise.all([api.getInsumos(), api.getColaboradores()]);
    if (a.ok && a.data) setItems(a.data);
    if (b.ok && b.data) setPeople(b.data);
  };
  useEffect(() => { load(); }, []);

  const saveItem = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setMessage('');
    const res = await api.guardarInsumo(item, session.token);
    setSaving(false); setMessage(res.message || (res.ok ? 'Guardado.' : 'No se pudo guardar.'));
    if (res.ok) { setItem(emptyItem); await load(); }
  };
  const savePerson = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setMessage('');
    const res = await api.guardarColaborador(person, session.token, originalName);
    setSaving(false); setMessage(res.message || (res.ok ? 'Guardado.' : 'No se pudo guardar.'));
    if (res.ok) { setPerson(emptyPerson); setOriginalName(''); await load(); }
  };

  const input = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-slate-500';
  return <div className="max-w-6xl mx-auto px-4 py-6">
    <div className="flex items-center justify-between mb-5">
      <div><h1 className="text-2xl font-bold">Administrar</h1><p className="text-sm text-slate-500">Catálogo y personas habilitadas</p></div>
      <div className="flex rounded-xl bg-slate-200 p-1">
        <button onClick={() => { setSection('insumos'); setMessage(''); }} className={`px-4 py-2 rounded-lg text-sm flex gap-2 items-center ${section === 'insumos' ? 'bg-white shadow-sm font-semibold' : ''}`}><Package className="w-4 h-4"/>Insumos</button>
        <button onClick={() => { setSection('personas'); setMessage(''); }} className={`px-4 py-2 rounded-lg text-sm flex gap-2 items-center ${section === 'personas' ? 'bg-white shadow-sm font-semibold' : ''}`}><Users className="w-4 h-4"/>Personas</button>
      </div>
    </div>
    {message && <div className="mb-4 rounded-xl bg-slate-900 text-white px-4 py-3 text-sm">{message}</div>}

    {section === 'insumos' ? <div className="grid lg:grid-cols-[360px_1fr] gap-5">
      <form onSubmit={saveItem} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 h-fit">
        <h2 className="font-bold">{item.id ? 'Editar insumo' : 'Nuevo insumo'}</h2>
        <input className={input} placeholder="Nombre del insumo" value={item.insumo} onChange={e=>setItem({...item,insumo:e.target.value})} required/>
        <div className="grid grid-cols-2 gap-3"><input className={input} placeholder="Categoría" value={item.categoria} onChange={e=>setItem({...item,categoria:e.target.value})} required/><input className={input} placeholder="Unidad" value={item.unidad} onChange={e=>setItem({...item,unidad:e.target.value})} required/></div>
        <select className={input} value={item.provincia} onChange={e=>setItem({...item,provincia:e.target.value})}>{PROVINCIAS.map(x=><option key={x}>{x}</option>)}</select>
        <div className="grid grid-cols-2 gap-3"><label className="text-xs text-slate-500">Stock mínimo<input type="number" min="0" className={`${input} mt-1`} value={item.stockMinimo} onChange={e=>setItem({...item,stockMinimo:Number(e.target.value)})}/></label><label className="text-xs text-slate-500">Stock objetivo<input type="number" min="0" className={`${input} mt-1`} value={item.stockObjetivo} onChange={e=>setItem({...item,stockObjetivo:Number(e.target.value)})}/></label></div>
        <select className={input} value={item.activo} onChange={e=>setItem({...item,activo:e.target.value as 'Sí'|'No'})}><option>Sí</option><option>No</option></select>
        <div className="flex gap-2"><button disabled={saving} className="flex-1 bg-slate-900 text-white rounded-xl py-3 text-sm font-semibold flex justify-center gap-2"><Plus className="w-4 h-4"/>{saving?'Guardando...':'Guardar'}</button>{item.id&&<button type="button" onClick={()=>setItem(emptyItem)} className="px-3 border rounded-xl text-sm">Cancelar</button>}</div>
      </form>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden"><div className="max-h-[60vh] overflow-auto divide-y">{items.map(x=><button key={`${x.id}-${x.provincia}`} onClick={()=>setItem(x)} className="w-full p-4 text-left hover:bg-slate-50 flex items-center justify-between"><div><div className="font-semibold">{x.insumo}</div><div className="text-xs text-slate-500">{x.categoria} · {x.unidad} · {x.provincia} · mínimo {x.stockMinimo}</div></div><Pencil className="w-4 h-4 text-slate-400"/></button>)}</div></div>
    </div> : <div className="grid lg:grid-cols-[360px_1fr] gap-5">
      <form onSubmit={savePerson} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 h-fit"><h2 className="font-bold">{originalName?'Editar persona':'Nueva persona'}</h2><input className={input} placeholder="Nombre y apellido" value={person.nombre} onChange={e=>setPerson({...person,nombre:e.target.value})} required/><select className={input} value={person.sector} onChange={e=>setPerson({...person,sector:e.target.value})}>{SECTORES.map(x=><option key={x}>{x}</option>)}</select><select className={input} value={person.provincia} onChange={e=>setPerson({...person,provincia:e.target.value})}>{PROVINCIAS.map(x=><option key={x}>{x}</option>)}</select><button disabled={saving} className="w-full bg-slate-900 text-white rounded-xl py-3 text-sm font-semibold">{saving?'Guardando...':'Guardar persona'}</button></form>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden"><div className="max-h-[60vh] overflow-auto divide-y">{people.map(x=><button key={`${x.nombre}-${x.provincia}`} onClick={()=>{setPerson(x);setOriginalName(x.nombre)}} className="w-full p-4 text-left hover:bg-slate-50 flex justify-between"><div><div className="font-semibold">{x.nombre}</div><div className="text-xs text-slate-500">{x.sector} · {x.provincia}</div></div><Pencil className="w-4 h-4 text-slate-400"/></button>)}</div></div>
    </div>}
  </div>;
}
