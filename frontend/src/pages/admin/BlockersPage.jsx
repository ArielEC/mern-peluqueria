import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AdminPageHeader, AdminTable, ActionButtons,
  ConfirmDeleteModal, AdminModal, FormField, inputCls, selectCls, textareaCls,
} from '@/components/admin/AdminTable';
import {
  useAdminBlockers, useAdminCreateBlocker,
  useAdminUpdateBlocker, useAdminDeleteBlocker,
  useAdminProfessionals,
} from '@/hooks/useAdminEntities';

const TIPOS = [
  { value: 'vacaciones', label: 'Vacaciones' },
  { value: 'festivo', label: 'Festivo' },
  { value: 'personal', label: 'Personal' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'otro', label: 'Otro' },
];

const TIPO_COLORS = {
  vacaciones: 'bg-[#e9ddff] text-[#4e3b7c]',
  festivo: 'bg-[#ffdcbb] text-[#673d00]',
  personal: 'bg-[#eaedff] text-[#494454]',
  mantenimiento: 'bg-[#ffdad6] text-[#93000a]',
  otro: 'bg-[#eaedff] text-[#494454]',
};

const EMPTY_FORM = {
  titulo: '',
  descripcion: '',
  profesional: '',
  tipo: 'otro',
  fechaHoraInicio: '',
  fechaHoraFin: '',
};

function toDatetimeLocal(iso) {
  if (!iso) return '';
  return new Date(iso).toISOString().slice(0, 16);
}

function BlockerModal({ open, onClose, initial, professionals }) {
  const createMut = useAdminCreateBlocker();
  const updateMut = useAdminUpdateBlocker();
  const isEdit = Boolean(initial?._id);

  const [form, setForm] = useState(initial ? {
    titulo: initial.titulo || '',
    descripcion: initial.descripcion || '',
    profesional: initial.profesional?._id || initial.profesional || '',
    tipo: initial.tipo || 'otro',
    fechaHoraInicio: toDatetimeLocal(initial.fechaHoraInicio),
    fechaHoraFin: toDatetimeLocal(initial.fechaHoraFin),
  } : EMPTY_FORM);
  const [errors, setErrors] = useState({});

  if (!open) return null;

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); }

  function validate() {
    const e = {};
    if (!form.titulo.trim()) e.titulo = 'Título obligatorio';
    if (!form.fechaHoraInicio) e.fechaHoraInicio = 'Fecha de inicio obligatoria';
    if (!form.fechaHoraFin) e.fechaHoraFin = 'Fecha de fin obligatoria';
    if (form.fechaHoraInicio && form.fechaHoraFin && new Date(form.fechaHoraFin) <= new Date(form.fechaHoraInicio)) {
      e.fechaHoraFin = 'El fin debe ser posterior al inicio';
    }
    return e;
  }

  function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const payload = {
      titulo: form.titulo,
      descripcion: form.descripcion || undefined,
      profesional: form.profesional || null,
      tipo: form.tipo,
      fechaHoraInicio: new Date(form.fechaHoraInicio).toISOString(),
      fechaHoraFin: new Date(form.fechaHoraFin).toISOString(),
    };
    const mut = isEdit ? updateMut : createMut;
    const args = isEdit ? { id: initial._id, ...payload } : payload;
    mut.mutate(args, { onSuccess: onClose, onError: (err) => setErrors({ api: err?.response?.data?.error || 'Error' }) });
  }

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar Bloqueo' : 'Nuevo Bloqueo'}
      subtitle="Bloquea horas para vacaciones, festivos o mantenimiento"
      footer={<>
        <button onClick={onClose} className="flex-1 py-3 rounded-lg border border-[#cbc3d7]/40 text-[#494454] font-bold text-[0.875rem] hover:bg-[#f2f3ff]">Cancelar</button>
        <button onClick={handleSubmit} disabled={isPending} className="flex-1 py-3 rounded-lg bg-[#6b38d4] text-white font-bold text-[0.875rem] hover:brightness-110 disabled:opacity-60 flex items-center justify-center">
          {isPending ? <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : (isEdit ? 'Guardar' : 'Crear bloqueo')}
        </button>
      </>}
    >
      <div className="space-y-4">
        <FormField label="Título" error={errors.titulo} required>
          <input className={inputCls} value={form.titulo} onChange={(e) => set('titulo', e.target.value)} placeholder="Ej: Vacaciones agosto…" />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Tipo" error={errors.tipo}>
            <select className={selectCls} value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>
              {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </FormField>
          <FormField label="Profesional (vacío = global)">
            <select className={selectCls} value={form.profesional} onChange={(e) => set('profesional', e.target.value)}>
              <option value="">— Global (todo el salón) —</option>
              {professionals.map((p) => <option key={p._id} value={p._id}>{p.nombre}</option>)}
            </select>
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Inicio" error={errors.fechaHoraInicio} required>
            <input type="datetime-local" className={inputCls} value={form.fechaHoraInicio} onChange={(e) => set('fechaHoraInicio', e.target.value)} />
          </FormField>
          <FormField label="Fin" error={errors.fechaHoraFin} required>
            <input type="datetime-local" className={inputCls} value={form.fechaHoraFin} onChange={(e) => set('fechaHoraFin', e.target.value)} />
          </FormField>
        </div>
        <FormField label="Descripción (opcional)">
          <textarea className={textareaCls} rows={2} value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} placeholder="Detalles adicionales…" />
        </FormField>
        {errors.api && <div className="bg-[#ffdad6] text-[#93000a] rounded-lg px-4 py-3 text-[0.8rem] font-medium">{errors.api}</div>}
      </div>
    </AdminModal>
  );
}

export default function BlockersPage() {
  const { data: blockers = [], isLoading } = useAdminBlockers();
  const { data: professionals = [] } = useAdminProfessionals();
  const deleteMut = useAdminDeleteBlocker();

  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const filtered = useMemo(() => {
    if (!search) return blockers;
    const q = search.toLowerCase();
    return blockers.filter((b) => b.titulo.toLowerCase().includes(q));
  }, [blockers, search]);

  const columns = [
    {
      key: 'titulo', label: 'Bloqueo',
      render: (b) => (
        <div>
          <p className="font-bold text-[#131b2e] text-[0.875rem]">{b.titulo}</p>
          {b.descripcion && <p className="text-[0.75rem] text-[#494454] line-clamp-1">{b.descripcion}</p>}
        </div>
      ),
    },
    {
      key: 'tipo', label: 'Tipo',
      render: (b) => (
        <span className={`px-2.5 py-1 rounded-full text-[0.7rem] font-bold uppercase tracking-wide ${TIPO_COLORS[b.tipo] ?? 'bg-[#eaedff] text-[#494454]'}`}>
          {TIPOS.find((t) => t.value === b.tipo)?.label ?? b.tipo}
        </span>
      ),
    },
    {
      key: 'profesional', label: 'Alcance',
      render: (b) => {
        if (!b.profesional) return <span className="text-[0.8rem] font-bold text-[#6b38d4]">Global</span>;
        const prof = typeof b.profesional === 'object' ? b.profesional : professionals.find((p) => p._id === b.profesional);
        return <span className="text-[0.8rem] text-[#131b2e]">{prof?.nombre ?? '—'}</span>;
      },
    },
    {
      key: 'fechas', label: 'Periodo',
      render: (b) => (
        <div className="text-[0.8rem] text-[#494454]">
          <p>{b.fechaHoraInicio ? format(new Date(b.fechaHoraInicio), "d MMM yyyy HH:mm", { locale: es }) : '—'}</p>
          <p>{b.fechaHoraFin ? format(new Date(b.fechaHoraFin), "d MMM yyyy HH:mm", { locale: es }) : '—'}</p>
        </div>
      ),
    },
    {
      key: 'actions', label: 'Acciones', className: 'text-right',
      render: (b) => <ActionButtons onEdit={() => setModal(b)} onDelete={() => setDeleteTarget(b)} />,
    },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <AdminPageHeader
        title="Bloqueos"
        subtitle="Gestiona vacaciones, festivos y cierres"
        actionLabel="Nuevo Bloqueo"
        onAction={() => setModal('new')}
        searchValue={search}
        onSearch={setSearch}
        searchPlaceholder="Buscar bloqueo..."
      />

      <AdminTable
        columns={columns}
        rows={filtered.map((b) => ({ ...b, id: b._id }))}
        loading={isLoading}
        emptyIcon="block"
        emptyText="No hay bloqueos activos."
      />

      <BlockerModal
        key={modal?._id || 'new'}
        open={modal !== null}
        onClose={() => setModal(null)}
        initial={modal !== 'new' ? modal : undefined}
        professionals={professionals}
      />

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title="Eliminar Bloqueo"
        description={`¿Eliminar "${deleteTarget?.titulo}"?`}
        onConfirm={() => deleteMut.mutate(deleteTarget._id, { onSuccess: () => setDeleteTarget(null) })}
        onCancel={() => setDeleteTarget(null)}
        isPending={deleteMut.isPending}
      />
    </div>
  );
}
