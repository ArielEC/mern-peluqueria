import { useState, useEffect, useMemo } from 'react';
import {
  AdminPageHeader, AdminTable, ActionButtons, StatusToggle,
  ConfirmDeleteModal, AdminModal, FormField, inputCls, selectCls, textareaCls,
} from '@/components/admin/AdminTable';
import {
  useAdminServices, useAdminCreateService, useAdminUpdateService, useAdminDeleteService,
  useAdminProfessionals,
} from '@/hooks/useAdminEntities';

const EMPTY_FORM = { nombre: '', descripcion: '', duracion: 30, precio: 0, categoria: '', profesionalesCapaces: [], activo: true };

function ServiceModal({ open, onClose, initial, professionals }) {
  const createMut = useAdminCreateService();
  const updateMut = useAdminUpdateService();
  const isEdit = Boolean(initial?._id);

  function buildForm(data) {
    if (!data) return EMPTY_FORM;
    return {
      nombre: data.nombre || '',
      descripcion: data.descripcion || '',
      duracion: data.duracion ?? 30,
      precio: data.precio ?? 0,
      categoria: data.categoria || '',
      profesionalesCapaces: (data.profesionalesCapaces || []).map((p) => typeof p === 'object' ? p._id : p),
      activo: data.activo !== false,
    };
  }

  const [form, setForm] = useState(buildForm(initial));
  const [errors, setErrors] = useState({});

  // Sincroniza el form cuando se abre con un ítem diferente
  useEffect(() => {
    setForm(buildForm(initial));
    setErrors({});
  }, [initial]);

  if (!open) return null;

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); }

  function toggleProf(id) {
    setForm((f) => ({
      ...f,
      profesionalesCapaces: f.profesionalesCapaces.includes(id)
        ? f.profesionalesCapaces.filter((p) => p !== id)
        : [...f.profesionalesCapaces, id],
    }));
  }

  function validate() {
    const e = {};
    if (!form.nombre.trim()) e.nombre = 'Nombre obligatorio';
    if (!form.duracion || form.duracion < 15) e.duracion = 'Duración mínima 15 min';
    if (form.precio < 0) e.precio = 'El precio no puede ser negativo';
    return e;
  }

  function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const payload = { ...form, duracion: Number(form.duracion), precio: Number(form.precio) };
    const mut = isEdit ? updateMut : createMut;
    const args = isEdit ? { id: initial._id, ...payload } : payload;
    mut.mutate(args, { onSuccess: onClose, onError: (err) => setErrors({ api: err?.response?.data?.error || 'Error' }) });
  }

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar Servicio' : 'Nuevo Servicio'}
      subtitle={isEdit ? form.nombre : 'Completa los campos para añadir un servicio'}
      footer={<>
        <button onClick={onClose} className="flex-1 py-3 rounded-lg border border-[#cbc3d7]/40 text-[#494454] font-bold text-[0.875rem] hover:bg-[#f2f3ff]">Cancelar</button>
        <button onClick={handleSubmit} disabled={isPending} className="flex-1 py-3 rounded-lg bg-[#6b38d4] text-white font-bold text-[0.875rem] hover:brightness-110 disabled:opacity-60 flex items-center justify-center gap-2">
          {isPending ? <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : (isEdit ? 'Guardar cambios' : 'Crear servicio')}
        </button>
      </>}
    >
      <div className="space-y-4">
        <FormField label="Nombre" error={errors.nombre} required>
          <input className={inputCls} value={form.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Corte de precisión" />
        </FormField>
        <FormField label="Descripción" error={errors.descripcion}>
          <textarea className={textareaCls} rows={2} value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} placeholder="Descripción del servicio..." />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Duración (min)" error={errors.duracion} required>
            <input type="number" min={15} step={15} className={inputCls} value={form.duracion} onChange={(e) => set('duracion', e.target.value)} />
          </FormField>
          <FormField label="Precio (€)" error={errors.precio} required>
            <input type="number" min={0} step={0.5} className={inputCls} value={form.precio} onChange={(e) => set('precio', e.target.value)} />
          </FormField>
        </div>
        <FormField label="Categoría">
          <input className={inputCls} value={form.categoria} onChange={(e) => set('categoria', e.target.value)} placeholder="Ej: Coloración, Corte…" />
        </FormField>
        {professionals.length > 0 && (
          <FormField label="Profesionales capacitados">
            <div className="flex flex-wrap gap-2 mt-1">
              {professionals.map((p) => {
                const selected = form.profesionalesCapaces.includes(p._id);
                return (
                  <button
                    key={p._id}
                    type="button"
                    onClick={() => toggleProf(p._id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.75rem] font-bold transition-all ${selected ? 'text-white' : 'bg-[#eaedff] text-[#494454] hover:bg-[#e2e7ff]'}`}
                    style={selected ? { backgroundColor: p.color || '#6b38d4' } : {}}
                  >
                    {selected && <span className="material-symbols-outlined text-[14px]">check</span>}
                    {p.nombre}
                  </button>
                );
              })}
            </div>
          </FormField>
        )}
        <div className="flex items-center gap-3">
          <StatusToggle active={form.activo} onChange={(v) => set('activo', v)} />
          <span className="text-[0.875rem] font-medium text-[#494454]">Servicio activo (visible para reservas)</span>
        </div>
        {errors.api && <div className="bg-[#ffdad6] text-[#93000a] rounded-lg px-4 py-3 text-[0.8rem] font-medium">{errors.api}</div>}
      </div>
    </AdminModal>
  );
}

export default function ServicesPage() {
  const { data: services = [], isLoading } = useAdminServices();
  const { data: professionals = [] } = useAdminProfessionals();
  const deleteMut = useAdminDeleteService();
  const updateMut = useAdminUpdateService();

  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null | 'new' | service object
  const [deleteTarget, setDeleteTarget] = useState(null);

  const filtered = useMemo(() => {
    if (!search) return services;
    const q = search.toLowerCase();
    return services.filter((s) => s.nombre.toLowerCase().includes(q) || (s.categoria || '').toLowerCase().includes(q));
  }, [services, search]);

  const columns = [
    {
      key: 'nombre', label: 'Servicio',
      render: (s) => (
        <div className={s.activo === false ? 'opacity-50' : ''}>
          <p className="font-bold text-[#131b2e] text-[0.875rem]">{s.nombre}</p>
          {s.descripcion && <p className="text-[0.75rem] text-[#494454] line-clamp-1">{s.descripcion}</p>}
        </div>
      ),
    },
    {
      key: 'categoria', label: 'Categoría',
      render: (s) => s.categoria ? (
        <span className="px-2.5 py-1 bg-[#e9ddff] text-[#4e3b7c] text-[0.7rem] font-bold rounded-full uppercase tracking-wide">
          {s.categoria}
        </span>
      ) : <span className="text-[#cbc3d7] text-[0.8rem]">—</span>,
    },
    {
      key: 'duracion', label: 'Duración',
      render: (s) => <span className="text-[0.875rem] font-medium text-[#131b2e]">{s.duracion} min</span>,
    },
    {
      key: 'precio', label: 'Precio',
      render: (s) => <span className="text-[0.875rem] font-bold text-[#131b2e]">{s.precio?.toFixed(2)} €</span>,
    },
    {
      key: 'activo', label: 'Estado', className: 'text-center',
      render: (s) => (
        <div className="flex justify-center">
          <StatusToggle
            active={s.activo !== false}
            onChange={(v) => updateMut.mutate({ id: s._id, activo: v })}
          />
        </div>
      ),
    },
    {
      key: 'actions', label: 'Acciones', className: 'text-right',
      render: (s) => <ActionButtons onEdit={() => setModal(s)} onDelete={() => setDeleteTarget(s)} />,
    },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <AdminPageHeader
        title="Servicios"
        subtitle="Gestiona el catálogo de servicios del salón"
        actionLabel="Nuevo Servicio"
        onAction={() => setModal('new')}
        searchValue={search}
        onSearch={setSearch}
        searchPlaceholder="Buscar servicio..."
      />

      <AdminTable
        columns={columns}
        rows={filtered.map((s) => ({ ...s, id: s._id }))}
        loading={isLoading}
        emptyIcon="content_cut"
        emptyText="No hay servicios. Crea el primero."
      />

      <ServiceModal
        open={modal !== null}
        onClose={() => setModal(null)}
        initial={modal !== 'new' ? modal : undefined}
        professionals={professionals}
      />

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title="Eliminar Servicio"
        description={`¿Eliminar "${deleteTarget?.nombre}"? Esta acción no se puede deshacer.`}
        onConfirm={() => deleteMut.mutate(deleteTarget._id, { onSuccess: () => setDeleteTarget(null) })}
        onCancel={() => setDeleteTarget(null)}
        isPending={deleteMut.isPending}
      />
    </div>
  );
}
