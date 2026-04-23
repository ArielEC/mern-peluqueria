import { useState, useMemo } from 'react';
import {
  AdminPageHeader, AdminTable, ActionButtons, StatusToggle,
  ConfirmDeleteModal, AdminModal, FormField,
} from '@/components/admin/AdminTable';
import { inputCls } from '@/components/admin/adminFormStyles';
import {
  useAdminProfessionals, useAdminCreateProfessional,
  useAdminUpdateProfessional, useAdminDeleteProfessional,
} from '@/hooks/useAdminEntities';

const DIAS = [
  { key: '1', label: 'Lun' }, { key: '2', label: 'Mar' }, { key: '3', label: 'Mié' },
  { key: '4', label: 'Jue' }, { key: '5', label: 'Vie' }, { key: '6', label: 'Sáb' },
  { key: '0', label: 'Dom' },
];

const EMPTY_HORARIO = Object.fromEntries(
  DIAS.map(({ key }) => [key, { activo: false, inicio: '09:00', fin: '18:00' }])
);

const EMPTY_FORM = { nombre: '', especialidad: '', color: '#6b38d4', activo: true, horarioSemanal: EMPTY_HORARIO };
const PRESET_COLORS = ['#6b38d4', '#665396', '#855000', '#0059c0', '#006e1c', '#ba1a1a', '#006874'];

function HorarioEditor({ horario, onChange }) {
  function setDia(key, field, value) {
    onChange({ ...horario, [key]: { ...horario[key], [field]: value } });
  }
  return (
    <div className="space-y-2">
      {DIAS.map(({ key, label }) => {
        const dia = horario[key] || { activo: false, inicio: '09:00', fin: '18:00' };
        return (
          <div key={key} className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${dia.activo ? 'bg-[#f2f3ff]' : 'bg-[#faf8ff]'}`}>
            <label className="flex items-center gap-2 w-20 shrink-0 cursor-pointer">
              <input type="checkbox" checked={dia.activo} onChange={(e) => setDia(key, 'activo', e.target.checked)} className="w-4 h-4 rounded accent-[#6b38d4]" />
              <span className={`text-[0.8rem] font-bold ${dia.activo ? 'text-[#131b2e]' : 'text-[#cbc3d7]'}`}>{label}</span>
            </label>
            {dia.activo ? (
              <div className="flex items-center gap-2 flex-1">
                <input type="time" value={dia.inicio} onChange={(e) => setDia(key, 'inicio', e.target.value)}
                  className="flex-1 bg-white border border-[#cbc3d7]/30 rounded-lg px-2 py-1 text-[0.8rem] outline-none focus:ring-2 focus:ring-[#6b38d4]" />
                <span className="text-[#494454] text-[0.75rem]">—</span>
                <input type="time" value={dia.fin} onChange={(e) => setDia(key, 'fin', e.target.value)}
                  className="flex-1 bg-white border border-[#cbc3d7]/30 rounded-lg px-2 py-1 text-[0.8rem] outline-none focus:ring-2 focus:ring-[#6b38d4]" />
              </div>
            ) : (
              <span className="text-[0.75rem] text-[#cbc3d7] italic">No trabaja</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ProfModal({ open, onClose, initial }) {
  const createMut = useAdminCreateProfessional();
  const updateMut = useAdminUpdateProfessional();
  const isEdit = Boolean(initial?._id);

  const [form, setForm] = useState(() => initial ? {
    nombre: initial.nombre || '',
    especialidad: initial.especialidad || '',
    color: initial.color || '#6b38d4',
    activo: initial.activo !== false,
    horarioSemanal: initial.horarioSemanal || EMPTY_HORARIO,
  } : EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [tab, setTab] = useState('info'); // 'info' | 'horario'

  if (!open) return null;

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); }

  function validate() {
    const e = {};
    if (!form.nombre.trim()) e.nombre = 'Nombre obligatorio';
    if (!form.especialidad.trim()) e.especialidad = 'Especialidad obligatoria';
    if (!form.color.match(/^#[0-9a-fA-F]{6}$/)) e.color = 'Color inválido';
    return e;
  }

  function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); setTab('info'); return; }
    const mut = isEdit ? updateMut : createMut;
    const args = isEdit ? { id: initial._id, ...form } : form;
    mut.mutate(args, { onSuccess: onClose, onError: (err) => setErrors({ api: err?.response?.data?.error || 'Error' }) });
  }

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar Profesional' : 'Nuevo Profesional'}
      subtitle={isEdit ? form.nombre : 'Añade un miembro al equipo'}
      footer={<>
        <button onClick={onClose} className="flex-1 py-3 rounded-lg border border-[#cbc3d7]/40 text-[#494454] font-bold text-[0.875rem] hover:bg-[#f2f3ff]">Cancelar</button>
        <button onClick={handleSubmit} disabled={isPending} className="flex-1 py-3 rounded-lg bg-[#6b38d4] text-white font-bold text-[0.875rem] hover:brightness-110 disabled:opacity-60 flex items-center justify-center">
          {isPending ? <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : (isEdit ? 'Guardar cambios' : 'Crear profesional')}
        </button>
      </>}
    >
      {/* Tabs */}
      <div className="flex gap-1 bg-[#f2f3ff] rounded-lg p-1 mb-5">
        {[['info', 'person', 'Información'], ['horario', 'schedule', 'Horario']].map(([key, icon, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-[0.8rem] font-bold transition-all ${tab === key ? 'bg-white text-[#6b38d4] shadow-sm' : 'text-[#494454]'}`}>
            <span className="material-symbols-outlined text-[16px]">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="space-y-4">
          <FormField label="Nombre" error={errors.nombre} required>
            <input className={inputCls} value={form.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Nombre completo" />
          </FormField>
          <FormField label="Especialidad" error={errors.especialidad} required>
            <input className={inputCls} value={form.especialidad} onChange={(e) => set('especialidad', e.target.value)} placeholder="Ej: Colorista, Barbero…" />
          </FormField>
          <FormField label="Color identificativo" error={errors.color}>
            <div className="flex items-center gap-3 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => set('color', c)}
                  className={`w-8 h-8 rounded-xl shrink-0 transition-transform hover:scale-110 ${form.color === c ? 'ring-2 ring-offset-2 ring-[#6b38d4] scale-110' : ''}`}
                  style={{ backgroundColor: c }} />
              ))}
              <input type="color" value={form.color} onChange={(e) => set('color', e.target.value)}
                className="w-8 h-8 rounded-xl border-0 cursor-pointer p-0 bg-transparent" title="Color personalizado" />
            </div>
          </FormField>
          <div className="flex items-center gap-3">
            <StatusToggle active={form.activo} onChange={(v) => set('activo', v)} />
            <span className="text-[0.875rem] font-medium text-[#494454]">Profesional activo</span>
          </div>
          {errors.api && <div className="bg-[#ffdad6] text-[#93000a] rounded-lg px-4 py-3 text-[0.8rem] font-medium">{errors.api}</div>}
        </div>
      )}

      {tab === 'horario' && (
        <HorarioEditor horario={form.horarioSemanal} onChange={(h) => set('horarioSemanal', h)} />
      )}
    </AdminModal>
  );
}

export default function ProfessionalsPage() {
  const { data: professionals = [], isLoading } = useAdminProfessionals();
  const deleteMut = useAdminDeleteProfessional();

  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const filtered = useMemo(() => {
    if (!search) return professionals;
    const q = search.toLowerCase();
    return professionals.filter((p) => p.nombre.toLowerCase().includes(q) || (p.especialidad || '').toLowerCase().includes(q));
  }, [professionals, search]);

  function getDiasActivos(horario) {
    if (!horario) return '—';
    const labels = { 1: 'L', 2: 'M', 3: 'X', 4: 'J', 5: 'V', 6: 'S', 0: 'D' };
    return Object.entries(horario)
      .filter(([, v]) => v?.activo)
      .map(([k]) => labels[k] || k)
      .join(' · ') || '—';
  }

  const columns = [
    {
      key: 'nombre', label: 'Profesional',
      render: (p) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ backgroundColor: p.color || '#6b38d4' }}>
            {p.nombre?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-[#131b2e] text-[0.875rem]">{p.nombre}</p>
            <p className="text-[0.75rem] text-[#494454]">{p.especialidad}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'horario', label: 'Horario',
      render: (p) => <span className="text-[0.8rem] text-[#494454] font-mono">{getDiasActivos(p.horarioSemanal)}</span>,
    },
    {
      key: 'activo', label: 'Estado', className: 'text-center',
      render: (p) => (
        <div className="flex justify-center">
          <span className={`px-2.5 py-1 rounded-full text-[0.7rem] font-bold ${p.activo !== false ? 'bg-[#e9ddff] text-[#4e3b7c]' : 'bg-[#eaedff] text-[#494454]'}`}>
            {p.activo !== false ? 'Activo' : 'Inactivo'}
          </span>
        </div>
      ),
    },
    {
      key: 'actions', label: 'Acciones', className: 'text-right',
      render: (p) => <ActionButtons onEdit={() => setModal(p)} onDelete={() => setDeleteTarget(p)} />,
    },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <AdminPageHeader
        title="Profesionales"
        subtitle="Gestiona el equipo y sus horarios semanales"
        actionLabel="Nuevo Profesional"
        onAction={() => setModal('new')}
        searchValue={search}
        onSearch={setSearch}
        searchPlaceholder="Buscar profesional..."
      />

      <AdminTable
        columns={columns}
        rows={filtered.map((p) => ({ ...p, id: p._id }))}
        loading={isLoading}
        emptyIcon="badge"
        emptyText="No hay profesionales. Crea el primero."
      />

      <ProfModal
        key={modal?._id || 'new'}
        open={modal !== null}
        onClose={() => setModal(null)}
        initial={modal !== 'new' ? modal : undefined}
      />

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title="Eliminar Profesional"
        description={`¿Eliminar a "${deleteTarget?.nombre}"? Sus citas futuras no se verán afectadas.`}
        onConfirm={() => deleteMut.mutate(deleteTarget._id, { onSuccess: () => setDeleteTarget(null) })}
        onCancel={() => setDeleteTarget(null)}
        isPending={deleteMut.isPending}
      />
    </div>
  );
}
