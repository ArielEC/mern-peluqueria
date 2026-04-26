import { useMemo, useState } from 'react';
import {
  ActionButtons,
  AdminModal,
  AdminPageHeader,
  AdminTable,
  ConfirmDeleteModal,
  FormField,
  StatusToggle,
} from '@/components/admin/AdminTable';
import { inputCls, textareaCls } from '@/components/admin/adminFormStyles';
import {
  useAdminCreateService,
  useAdminDeleteService,
  useAdminProfessionals,
  useAdminServices,
  useAdminUpdateService,
} from '@/hooks/useAdminEntities';
import { notifyValidationError } from '@/lib/notifications';

const EMPTY_FORM = {
  nombre: '',
  descripcion: '',
  duracion: 30,
  precio: 0,
  categoria: '',
  orden: 0,
  profesionalesCapaces: [],
  activo: true,
};

function buildForm(data) {
  if (!data) return EMPTY_FORM;

  return {
    nombre: data.nombre || '',
    descripcion: data.descripcion || '',
    duracion: data.duracion ?? 30,
    precio: data.precio ?? 0,
    categoria: data.categoria || '',
    orden: data.orden ?? 0,
    profesionalesCapaces: (data.profesionalesCapaces || []).map((professional) => (
      typeof professional === 'object' ? professional._id : professional
    )),
    activo: data.activo !== false,
  };
}

function ServiceModal({ open, onClose, initial, professionals }) {
  const createMut = useAdminCreateService();
  const updateMut = useAdminUpdateService();
  const isEdit = Boolean(initial?._id);

  const [form, setForm] = useState(() => buildForm(initial));
  const [errors, setErrors] = useState({});

  if (!open) return null;

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined, api: undefined }));
  }

  function toggleProf(id) {
    setForm((current) => ({
      ...current,
      profesionalesCapaces: current.profesionalesCapaces.includes(id)
        ? current.profesionalesCapaces.filter((profId) => profId !== id)
        : [...current.profesionalesCapaces, id],
    }));
  }

  function validate() {
    const nextErrors = {};

    if (!form.nombre.trim()) nextErrors.nombre = 'Nombre obligatorio';
    if (!form.duracion || Number(form.duracion) < 15) nextErrors.duracion = 'Duración mínima 15 min';
    if (Number(form.precio) < 0) nextErrors.precio = 'El precio no puede ser negativo';
    if (Number(form.orden) < 0 || !Number.isInteger(Number(form.orden))) {
      nextErrors.orden = 'El orden debe ser un número entero igual o mayor que 0';
    }

    return nextErrors;
  }

  function handleSubmit() {
    const nextErrors = validate();

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      notifyValidationError(nextErrors, 'Revisa los datos del servicio');
      return;
    }

    const payload = {
      ...form,
      duracion: Number(form.duracion),
      precio: Number(form.precio),
      orden: Number(form.orden),
    };

    const mutation = isEdit ? updateMut : createMut;
    const args = isEdit ? { id: initial._id, ...payload } : payload;

    mutation.mutate(args, {
      onSuccess: onClose,
      onError: (error) => setErrors({ api: error?.response?.data?.error || 'Error' }),
    });
  }

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar Servicio' : 'Nuevo Servicio'}
      subtitle={isEdit ? form.nombre : 'Completa los campos para añadir un servicio'}
      footer={(
        <>
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-[#cbc3d7]/40 py-3 text-[0.875rem] font-bold text-[#494454] hover:bg-[#f2f3ff]"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="flex-1 rounded-lg bg-[#6b38d4] py-3 text-[0.875rem] font-bold text-white hover:brightness-110 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isPending
              ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              : (isEdit ? 'Guardar cambios' : 'Crear servicio')}
          </button>
        </>
      )}
    >
      <div className="space-y-4">
        <FormField label="Nombre" error={errors.nombre} required>
          <input
            className={inputCls}
            value={form.nombre}
            onChange={(event) => set('nombre', event.target.value)}
            placeholder="Corte de precisión"
          />
        </FormField>

        <FormField label="Descripción" error={errors.descripcion}>
          <textarea
            className={textareaCls}
            rows={2}
            value={form.descripcion}
            onChange={(event) => set('descripcion', event.target.value)}
            placeholder="Descripción del servicio..."
          />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="Duración (min)" error={errors.duracion} required>
            <input
              type="number"
              min={15}
              step={15}
              className={inputCls}
              value={form.duracion}
              onChange={(event) => set('duracion', event.target.value)}
            />
          </FormField>

          <FormField label="Precio (€)" error={errors.precio} required>
            <input
              type="number"
              min={0}
              step={0.5}
              className={inputCls}
              value={form.precio}
              onChange={(event) => set('precio', event.target.value)}
            />
          </FormField>

          <FormField label="Orden catálogo" error={errors.orden} required>
            <input
              type="number"
              min={0}
              step={1}
              className={inputCls}
              value={form.orden}
              onChange={(event) => set('orden', event.target.value)}
            />
          </FormField>
        </div>

        <FormField label="Categoría">
          <input
            className={inputCls}
            value={form.categoria}
            onChange={(event) => set('categoria', event.target.value)}
            placeholder="Ej: Coloración, Corte..."
          />
        </FormField>

        {professionals.length > 0 && (
          <FormField label="Profesionales capacitados">
            <div className="mt-1 flex flex-wrap gap-2">
              {professionals.map((professional) => {
                const selected = form.profesionalesCapaces.includes(professional._id);

                return (
                  <button
                    key={professional._id}
                    type="button"
                    onClick={() => toggleProf(professional._id)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.75rem] font-bold transition-all ${selected ? 'text-white' : 'bg-[#eaedff] text-[#494454] hover:bg-[#e2e7ff]'
                      }`}
                    style={selected ? { backgroundColor: professional.color || '#6b38d4' } : {}}
                  >
                    {selected && <span className="material-symbols-outlined text-[14px]">check</span>}
                    {professional.nombre}
                  </button>
                );
              })}
            </div>
          </FormField>
        )}

        <div className="flex items-center gap-3">
          <StatusToggle active={form.activo} onChange={(value) => set('activo', value)} />
          <span className="text-[0.875rem] font-medium text-[#494454]">
            Servicio activo (visible para reservas)
          </span>
        </div>

        {errors.api && (
          <div className="rounded-lg bg-[#ffdad6] px-4 py-3 text-[0.8rem] font-medium text-[#93000a]">
            {errors.api}
          </div>
        )}
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
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const filtered = useMemo(() => {
    if (!search) return services;
    const q = search.toLowerCase();
    return services.filter((service) => (
      service.nombre.toLowerCase().includes(q)
      || (service.categoria || '').toLowerCase().includes(q)
    ));
  }, [services, search]);

  const orderedServiceIds = useMemo(
    () => services.map((service) => service._id),
    [services]
  );

  function moveService(service, direction) {
    const currentIndex = orderedServiceIds.indexOf(service._id);

    if (currentIndex === -1) {
      return;
    }

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const targetService = services[targetIndex];

    if (!targetService) {
      return;
    }

    updateMut.mutate({
      id: service._id,
      orden: targetService.orden,
    });
  }

  const columns = [
    {
      key: 'nombre',
      label: 'Servicio',
      render: (service) => (
        <div className={service.activo === false ? 'opacity-50' : ''}>
          <p className="text-[0.875rem] font-bold text-[#131b2e]">{service.nombre}</p>
          {service.descripcion && (
            <p className="line-clamp-1 text-[0.75rem] text-[#494454]">{service.descripcion}</p>
          )}
        </div>
      ),
    },
    {
      key: 'categoria',
      label: 'Categoría',
      render: (service) => service.categoria ? (
        <span className="rounded-full bg-[#e9ddff] px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wide text-[#4e3b7c]">
          {service.categoria}
        </span>
      ) : (
        <span className="text-[0.8rem] text-[#cbc3d7]">—</span>
      ),
    },
    {
      key: 'duracion',
      label: 'Duración',
      render: (service) => <span className="text-[0.875rem] font-medium text-[#131b2e]">{service.duracion} min</span>,
    },
    {
      key: 'orden',
      label: 'Orden',
      render: (service) => {
        const currentIndex = orderedServiceIds.indexOf(service._id);
        const canMoveUp = currentIndex > 0;
        const canMoveDown = currentIndex !== -1 && currentIndex < orderedServiceIds.length - 1;

        return (
          <div className="flex items-center gap-2">
            <span className="min-w-[2.5rem] text-[0.875rem] font-bold text-[#131b2e]">#{service.orden ?? 0}</span>
            <div className="flex items-center rounded-lg border border-[#cbc3d7]/30 bg-[#f8f5ff]">
              <button
                type="button"
                onClick={() => moveService(service, 'up')}
                disabled={!canMoveUp || updateMut.isPending}
                className="flex h-8 w-8 items-center justify-center text-[#494454] transition-colors hover:bg-[#e9ddff] hover:text-[#6b38d4] disabled:cursor-not-allowed disabled:opacity-35"
                title="Subir servicio"
              >
                <span className="material-symbols-outlined text-[18px]">keyboard_arrow_up</span>
              </button>
              <button
                type="button"
                onClick={() => moveService(service, 'down')}
                disabled={!canMoveDown || updateMut.isPending}
                className="flex h-8 w-8 items-center justify-center border-l border-[#cbc3d7]/30 text-[#494454] transition-colors hover:bg-[#e9ddff] hover:text-[#6b38d4] disabled:cursor-not-allowed disabled:opacity-35"
                title="Bajar servicio"
              >
                <span className="material-symbols-outlined text-[18px]">keyboard_arrow_down</span>
              </button>
            </div>
          </div>
        );
      },
    },
    {
      key: 'precio',
      label: 'Precio',
      render: (service) => <span className="text-[0.875rem] font-bold text-[#131b2e]">{service.precio?.toFixed(2)} €</span>,
    },
    {
      key: 'activo',
      label: 'Estado',
      className: 'text-center',
      render: (service) => (
        <div className="flex justify-center">
          <StatusToggle
            active={service.activo !== false}
            onChange={(value) => updateMut.mutate({ id: service._id, activo: value })}
          />
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Acciones',
      className: 'text-right',
      render: (service) => (
        <ActionButtons
          onEdit={() => setModal(service)}
          onDelete={() => setDeleteTarget(service)}
        />
      ),
    },
  ];

  return (
    <div className="flex max-w-6xl flex-col gap-6">
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
        rows={filtered.map((service) => ({ ...service, id: service._id }))}
        loading={isLoading}
        emptyIcon="content_cut"
        emptyText="No hay servicios. Crea el primero."
      />

      <ServiceModal
        key={modal?._id ?? modal ?? 'closed'}
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
