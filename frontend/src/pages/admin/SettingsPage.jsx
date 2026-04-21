import { useState, useEffect } from 'react';
import { useAdminSettings, useAdminUpdateSettings } from '@/hooks/useAdminEntities';
import { FormField, inputCls, selectCls, textareaCls } from '@/components/admin/AdminTable';

function Section({ icon, title, children }) {
  return (
    <div className="bg-white rounded-xl border border-[#cbc3d7]/20 shadow-[0_12px_40px_-12px_hsla(262,83%,10%,0.04)] overflow-hidden">
      <div className="px-6 py-4 border-b border-[#cbc3d7]/10 flex items-center gap-2">
        <span className="material-symbols-outlined text-[20px] text-[#6b38d4]">{icon}</span>
        <h3 className="font-bold text-[#131b2e]">{title}</h3>
      </div>
      <div className="p-6 space-y-4">{children}</div>
    </div>
  );
}

function SaveButton({ isPending, saved }) {
  return (
    <button
      type="submit"
      disabled={isPending}
      className="flex items-center gap-2 px-6 py-3 bg-[#6b38d4] text-white rounded-xl font-bold text-[0.875rem] hover:brightness-110 active:scale-95 transition-all disabled:opacity-60 shadow-sm shadow-[#6b38d4]/20"
    >
      {isPending
        ? <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
        : saved
        ? <><span className="material-symbols-outlined text-[18px]">check</span> Guardado</>
        : <><span className="material-symbols-outlined text-[18px]">save</span> Guardar cambios</>
      }
    </button>
  );
}

export default function SettingsPage() {
  const { data: settings, isLoading } = useAdminSettings();
  const updateMut = useAdminUpdateSettings();
  const [saved, setSaved] = useState(false);
  const [apiError, setApiError] = useState('');

  const [form, setForm] = useState({
    nombreNegocio: '',
    telefono: '',
    email: '',
    direccion: '',
    horasMinimasCancelacion: 24,
    diasMaximosReserva: 30,
    duracionSlot: 15,
    mensajeBienvenida: '',
    politicaCancelacion: '',
    zonaHoraria: 'Europe/Madrid',
  });

  // Sincronizar cuando lleguen los settings de la API
  useEffect(() => {
    if (settings) {
      setForm({
        nombreNegocio: settings.nombreNegocio || '',
        telefono: settings.telefono || '',
        email: settings.email || '',
        direccion: settings.direccion || '',
        horasMinimasCancelacion: settings.horasMinimasCancelacion ?? 24,
        diasMaximosReserva: settings.diasMaximosReserva ?? 30,
        duracionSlot: settings.duracionSlot ?? 15,
        mensajeBienvenida: settings.mensajeBienvenida || '',
        politicaCancelacion: settings.politicaCancelacion || '',
        zonaHoraria: settings.zonaHoraria || 'Europe/Madrid',
      });
    }
  }, [settings]);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); setSaved(false); }

  function handleSubmit(e) {
    e.preventDefault();
    setApiError('');
    const payload = {
      ...form,
      horasMinimasCancelacion: Number(form.horasMinimasCancelacion),
      diasMaximosReserva: Number(form.diasMaximosReserva),
      duracionSlot: Number(form.duracionSlot),
    };
    updateMut.mutate(payload, {
      onSuccess: () => { setSaved(true); setTimeout(() => setSaved(false), 3000); },
      onError: (err) => setApiError(err?.response?.data?.error || 'Error al guardar'),
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        {[1, 2, 3].map((i) => <div key={i} className="h-40 bg-[#f2f3ff] rounded-xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-3xl">
      {/* Page header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-[2rem] font-extrabold tracking-tight text-[#131b2e]">Ajustes</h2>
          <p className="text-[0.875rem] text-[#494454] mt-1">Configuración general del negocio</p>
        </div>
        <SaveButton isPending={updateMut.isPending} saved={saved} />
      </div>

      {/* Información del negocio */}
      <Section icon="storefront" title="Información del Negocio">
        <FormField label="Nombre del negocio">
          <input className={inputCls} value={form.nombreNegocio} onChange={(e) => set('nombreNegocio', e.target.value)} placeholder="The Precision Atelier" />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Teléfono">
            <input className={inputCls} value={form.telefono} onChange={(e) => set('telefono', e.target.value)} placeholder="612 345 678" />
          </FormField>
          <FormField label="Email">
            <input type="email" className={inputCls} value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="info@negocio.com" />
          </FormField>
        </div>
        <FormField label="Dirección">
          <input className={inputCls} value={form.direccion} onChange={(e) => set('direccion', e.target.value)} placeholder="Calle Mayor 1, 28001 Madrid" />
        </FormField>
        <FormField label="Zona horaria">
          <div className="flex items-center gap-3">
            <input className={inputCls + " bg-[#eaedff]/60 cursor-not-allowed"} value={form.zonaHoraria} readOnly disabled />
            <span className="material-symbols-outlined text-[16px] text-[#494454] shrink-0" title="La zona horaria se establece al crear la peluquería y no se puede cambiar">lock</span>
          </div>
          <p className="text-[0.75rem] text-[#494454] mt-1">La zona horaria se fija al crear el negocio y no puede modificarse.</p>
        </FormField>
      </Section>

      {/* Reservas */}
      <Section icon="event_available" title="Configuración de Reservas">
        <div className="grid grid-cols-3 gap-4">
          <FormField label="Horas mín. cancelación">
            <input type="number" min={0} max={168} className={inputCls} value={form.horasMinimasCancelacion} onChange={(e) => set('horasMinimasCancelacion', e.target.value)} />
          </FormField>
          <FormField label="Días máx. por adelantado">
            <input type="number" min={1} max={365} className={inputCls} value={form.diasMaximosReserva} onChange={(e) => set('diasMaximosReserva', e.target.value)} />
          </FormField>
          <FormField label="Duración del slot">
            <select className={selectCls} value={form.duracionSlot} onChange={(e) => set('duracionSlot', e.target.value)}>
              <option value={15}>15 minutos</option>
              <option value={30}>30 minutos</option>
            </select>
          </FormField>
        </div>
        <div className="bg-[#f2f3ff] rounded-lg p-4 text-[0.8rem] text-[#494454] flex items-start gap-2">
          <span className="material-symbols-outlined text-[16px] text-[#6b38d4] shrink-0 mt-0.5">info</span>
          <p>El slot define la granularidad del calendario: con 15 min se pueden crear citas a las :00, :15, :30 y :45. El sistema redondea automáticamente las duraciones de los servicios al múltiplo más cercano.</p>
        </div>
      </Section>

      {/* Textos */}
      <Section icon="message" title="Mensajes y Política">
        <FormField label="Mensaje de bienvenida">
          <textarea className={textareaCls} rows={3} value={form.mensajeBienvenida} onChange={(e) => set('mensajeBienvenida', e.target.value)} placeholder="Texto que verán los clientes al llegar a la página principal..." />
        </FormField>
        <FormField label="Política de cancelación">
          <textarea className={textareaCls} rows={3} value={form.politicaCancelacion} onChange={(e) => set('politicaCancelacion', e.target.value)} placeholder="Las cancelaciones deben realizarse con al menos X horas de antelación..." />
        </FormField>
      </Section>

      {/* Error y botón final */}
      {apiError && (
        <div className="bg-[#ffdad6] text-[#93000a] rounded-xl px-5 py-4 text-[0.875rem] font-medium flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          {apiError}
        </div>
      )}

      <div className="flex justify-end">
        <SaveButton isPending={updateMut.isPending} saved={saved} />
      </div>
    </form>
  );
}
