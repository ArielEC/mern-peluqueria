import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AdminPageHeader, AdminTable, ConfirmDeleteModal, AdminModal, FormField } from '@/components/admin/AdminTable';
import { inputCls, selectCls, textareaCls } from '@/components/admin/adminFormStyles';
import { useAdminClients, useAdminTechnicalNotes, useAdminCreateNote, useAdminUpdateNote, useAdminDeleteNote } from '@/hooks/useAdminEntities';

const CATEGORIAS = [
  { value: 'color', label: 'Color', color: 'bg-[#ffdcbb] text-[#673d00]' },
  { value: 'tratamiento', label: 'Tratamiento', color: 'bg-[#e9ddff] text-[#4e3b7c]' },
  { value: 'alergia', label: 'Alergia', color: 'bg-[#ffdad6] text-[#93000a]' },
  { value: 'preferencia', label: 'Preferencia', color: 'bg-[#eaedff] text-[#544183]' },
  { value: 'otro', label: 'Otro', color: 'bg-[#f2f3ff] text-[#494454]' },
];

function getCatStyle(cat) {
  return CATEGORIAS.find((c) => c.value === cat)?.color ?? 'bg-[#f2f3ff] text-[#494454]';
}

// ─── Note form modal ──────────────────────────────────────────────────────────
function NoteModal({ open, onClose, initial, clienteId }) {
  const createMut = useAdminCreateNote();
  const updateMut = useAdminUpdateNote();
  const isEdit = Boolean(initial?._id);
  const [form, setForm] = useState(initial ? {
    titulo: initial.titulo || '',
    contenido: initial.contenido || '',
    categoria: initial.categoria || 'otro',
    importante: initial.importante || false,
  } : { titulo: '', contenido: '', categoria: 'otro', importante: false });
  const [errors, setErrors] = useState({});

  if (!open) return null;

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); }

  function handleSubmit() {
    if (!form.contenido.trim()) { setErrors({ contenido: 'El contenido es obligatorio' }); return; }
    const payload = { ...form, clienteId };
    const mut = isEdit ? updateMut : createMut;
    const args = isEdit ? { id: initial._id, titulo: form.titulo, contenido: form.contenido, categoria: form.categoria, importante: form.importante } : payload;
    mut.mutate(args, { onSuccess: onClose, onError: (err) => setErrors({ api: err?.response?.data?.error || 'Error' }) });
  }

  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar Nota' : 'Nueva Nota Técnica'}
      subtitle="Registro interno del profesional"
      footer={<>
        <button onClick={onClose} className="flex-1 py-3 rounded-lg border border-[#cbc3d7]/40 text-[#494454] font-bold text-[0.875rem] hover:bg-[#f2f3ff]">Cancelar</button>
        <button onClick={handleSubmit} disabled={isPending} className="flex-1 py-3 rounded-lg bg-[#6b38d4] text-white font-bold text-[0.875rem] hover:brightness-110 disabled:opacity-60 flex items-center justify-center">
          {isPending ? <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : (isEdit ? 'Guardar' : 'Añadir nota')}
        </button>
      </>}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Categoría">
            <select className={selectCls} value={form.categoria} onChange={(e) => set('categoria', e.target.value)}>
              {CATEGORIAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </FormField>
          <FormField label="Título (opcional)">
            <input className={inputCls} value={form.titulo} onChange={(e) => set('titulo', e.target.value)} placeholder="Ej: Fórmula de color…" />
          </FormField>
        </div>
        <FormField label="Contenido" error={errors.contenido} required>
          <textarea className={textareaCls} rows={4} value={form.contenido} onChange={(e) => set('contenido', e.target.value)} placeholder="Descripción detallada…" />
        </FormField>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={form.importante} onChange={(e) => set('importante', e.target.checked)} className="w-4 h-4 rounded accent-[#6b38d4]" />
          <span className="text-[0.875rem] font-medium text-[#131b2e]">Marcar como importante</span>
        </label>
        {errors.api && <div className="bg-[#ffdad6] text-[#93000a] rounded-lg px-4 py-3 text-[0.8rem] font-medium">{errors.api}</div>}
      </div>
    </AdminModal>
  );
}

// ─── Client detail panel ──────────────────────────────────────────────────────
function ClientDetail({ client, onClose }) {
  const { data: notes = [], isLoading } = useAdminTechnicalNotes(client._id);
  const deleteMut = useAdminDeleteNote();
  const [noteModal, setNoteModal] = useState(null);
  const [deleteNote, setDeleteNote] = useState(null);

  const initials = client.nombre?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="flex flex-col gap-6">
      {/* Client card */}
      <div className="bg-[#f2f3ff] rounded-xl p-5 flex flex-col sm:flex-row items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-[#6b38d4] flex items-center justify-center text-white text-lg font-black shrink-0">
          {initials}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-bold text-[#131b2e]">{client.nombre}</h3>
            <span className={`px-2 py-0.5 rounded-full text-[0.65rem] font-bold ${client.activo !== false ? 'bg-[#e9ddff] text-[#4e3b7c]' : 'bg-[#eaedff] text-[#494454]'}`}>
              {client.activo !== false ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <p className="text-[0.8rem] text-[#494454] mt-1">{client.email}</p>
          {client.telefono && <p className="text-[0.8rem] text-[#494454]">{client.telefono}</p>}
          <p className="text-[0.7rem] text-[#cbc3d7] mt-2">
            Cliente desde {client.createdAt ? format(new Date(client.createdAt), "MMMM yyyy", { locale: es }) : '—'}
          </p>
        </div>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white text-[#494454] shrink-0">
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      {/* Technical notes */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h4 className="font-bold text-[#131b2e] flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#6b38d4]">clinical_notes</span>
            Notas Técnicas
            {notes.length > 0 && (
              <span className="bg-[#e9ddff] text-[#4e3b7c] text-[0.65rem] font-bold px-2 py-0.5 rounded-full">{notes.length}</span>
            )}
          </h4>
          <button
            onClick={() => setNoteModal('new')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#6b38d4] text-white rounded-lg text-[0.8rem] font-bold hover:brightness-110 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Añadir nota
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="h-16 bg-[#f2f3ff] rounded-xl animate-pulse" />)}
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-8 text-[#494454] border-2 border-dashed border-[#cbc3d7]/30 rounded-xl">
            <span className="material-symbols-outlined text-3xl text-[#cbc3d7] block mb-2">clinical_notes</span>
            <p className="text-[0.875rem]">Sin notas técnicas todavía</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div key={note._id} className={`bg-white rounded-xl p-4 border ${note.importante ? 'border-[#ffdcbb]' : 'border-[#cbc3d7]/15'} shadow-[0_2px_8px_-2px_hsla(262,83%,10%,0.04)]`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[0.65rem] font-bold uppercase ${getCatStyle(note.categoria)}`}>
                        {CATEGORIAS.find((c) => c.value === note.categoria)?.label ?? note.categoria}
                      </span>
                      {note.importante && (
                        <span className="flex items-center gap-1 text-[0.65rem] font-bold text-[#673d00]">
                          <span className="material-symbols-outlined text-[14px]">star</span>
                          Importante
                        </span>
                      )}
                      {note.titulo && <span className="text-[0.8rem] font-bold text-[#131b2e]">{note.titulo}</span>}
                    </div>
                    <p className="text-[0.8rem] text-[#494454] leading-relaxed">{note.contenido}</p>
                    <p className="text-[0.65rem] text-[#cbc3d7] mt-2">
                      {note.createdAt ? format(new Date(note.createdAt), "d MMM yyyy", { locale: es }) : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setNoteModal(note)} className="p-1.5 rounded-lg text-[#494454] hover:text-[#6b38d4] hover:bg-[#f2f3ff] transition-colors">
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                    <button onClick={() => setDeleteNote(note)} className="p-1.5 rounded-lg text-[#494454] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/30 transition-colors">
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <NoteModal
        key={noteModal?._id || 'new'}
        open={noteModal !== null}
        onClose={() => setNoteModal(null)}
        initial={noteModal !== 'new' ? noteModal : undefined}
        clienteId={client._id}
      />

      <ConfirmDeleteModal
        open={Boolean(deleteNote)}
        title="Eliminar Nota"
        description="¿Eliminar esta nota técnica?"
        onConfirm={() => deleteMut.mutate(deleteNote._id, { onSuccess: () => setDeleteNote(null) })}
        onCancel={() => setDeleteNote(null)}
        isPending={deleteMut.isPending}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ClientsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const timerRef = useRef(null);

  // Debounce limpio con useEffect
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timerRef.current);
  }, [search]);

  const { data: clients = [], isLoading } = useAdminClients(debouncedSearch);

  const columns = [
    {
      key: 'nombre', label: 'Cliente',
      render: (c) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#6b38d4]/10 flex items-center justify-center text-[#6b38d4] text-xs font-bold shrink-0">
            {c.nombre?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-[#131b2e] text-[0.875rem]">{c.nombre}</p>
            <p className="text-[0.75rem] text-[#494454]">{c.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'telefono', label: 'Teléfono',
      render: (c) => <span className="text-[0.875rem] text-[#494454]">{c.telefono || '—'}</span>,
    },
    {
      key: 'activo', label: 'Estado', className: 'text-center',
      render: (c) => (
        <div className="flex justify-center">
          <span className={`px-2.5 py-1 rounded-full text-[0.7rem] font-bold ${c.activo !== false ? 'bg-[#e9ddff] text-[#4e3b7c]' : 'bg-[#eaedff] text-[#494454]'}`}>
            {c.activo !== false ? 'Activo' : 'Inactivo'}
          </span>
        </div>
      ),
    },
    {
      key: 'createdAt', label: 'Registro',
      render: (c) => (
        <span className="text-[0.8rem] text-[#494454]">
          {c.createdAt ? format(new Date(c.createdAt), "d MMM yyyy", { locale: es }) : '—'}
        </span>
      ),
    },
    {
      key: 'actions', label: 'Ficha', className: 'text-right',
      render: (c) => (
        <button
          onClick={() => setSelectedClient(c)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[#6b38d4] font-bold text-[0.75rem] hover:bg-[#6b38d4]/10 rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">person_search</span>
          Ver ficha
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <AdminPageHeader
        title="Clientes"
        subtitle="Consulta la base de clientes y sus notas técnicas"
        searchValue={search}
        onSearch={setSearch}
        searchPlaceholder="Buscar por nombre, email o teléfono..."
      />

      <div className={`grid gap-6 transition-all ${selectedClient ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`}>
        <AdminTable
          columns={columns}
          rows={clients.map((c) => ({ ...c, id: c._id }))}
          loading={isLoading}
          emptyIcon="group"
          emptyText="No se encontraron clientes."
        />

        {selectedClient && (
          <div className="bg-white rounded-xl p-6 border border-[#cbc3d7]/20 shadow-[0_12px_40px_-12px_hsla(262,83%,10%,0.08)] h-fit">
            <ClientDetail client={selectedClient} onClose={() => setSelectedClient(null)} />
          </div>
        )}
      </div>
    </div>
  );
}
