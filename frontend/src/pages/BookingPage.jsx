import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  startOfMonth, endOfMonth, eachDayOfInterval, getDay,
  addMonths, subMonths, isSameDay, isToday, isBefore,
  startOfDay, addDays, format,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Search, ChevronLeft, ChevronRight, Clock, Euro,
  CalendarCheck, ArrowRight, ArrowLeft, Check, Scissors,
} from 'lucide-react';
import { useServices } from '@/hooks/useServices';
import { useAvailability } from '@/hooks/useAvailability';
import { useCreateAppointment } from '@/hooks/useAppointments';
import { useProfessionals } from '@/hooks/useProfessionals';
import { useSettings } from '@/hooks/useSettings';
import { notifyInfo } from '@/lib/notifications';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(minutes) {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

function formatPrice(price) {
  if (price === undefined || price === null) return '';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency', currency: 'EUR',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(price);
}

/**
 * Obtiene el offset UTC de una zona horaria IANA para una fecha dada.
 * Devuelve string tipo "+02:00" o "-05:00".
 */
function getIANAOffset(tz, date) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'longOffset',
    }).formatToParts(date);
    const tzName = parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
    // tzName es "GMT+2", "GMT-05:00", "GMT+0", etc.
    const raw = tzName.replace('GMT', '') || '+00:00';
    const match = raw.match(/^([+-])(\d{1,2})(?::(\d{2}))?$/);
    if (!match) return '+00:00';
    const h = match[2].padStart(2, '0');
    const m = match[3] ?? '00';
    return `${match[1]}${h}:${m}`;
  } catch {
    return '+00:00';
  }
}

/**
 * Construye una fecha ISO correcta para el backend combinando una fecha local
 * (YYYY-MM-DD) y la hora del slot (HH:MM) en la zona horaria del negocio.
 * Evita el bug de setHours() que usa la TZ del navegador en lugar de la del negocio.
 */
function buildFechaHoraInicio(dateStr, hora, businessTz = 'Europe/Madrid') {
  // Aproximación de la fecha para obtener el offset correcto (DST-aware)
  const approx = new Date(`${dateStr}T${hora}:00.000Z`);
  const offset = getIANAOffset(businessTz, approx);
  // Construir ISO con el offset explícito de la TZ del negocio
  return `${dateStr}T${hora}:00.000${offset}`;
}

// ─── Stepper ──────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Servicio' },
  { id: 2, label: 'Horario' },
  { id: 3, label: 'Confirmar' },
];

function Stepper({ currentStep }) {
  return (
    <div className="max-w-lg mx-auto mb-10 sm:mb-12 px-2 sm:px-0">
      <div className="flex items-center justify-between relative">
        {/* Progress line */}
        <div className="absolute top-5 left-0 w-full h-0.5 bg-primary/10 -z-10" />
        <div
          className="absolute top-5 left-0 h-0.5 bg-primary -z-10 transition-all duration-500"
          style={{ width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%' }}
        />

        {STEPS.map((step) => {
          const done = step.id < currentStep;
          const active = step.id === currentStep;
          return (
            <div key={step.id} className="flex flex-col items-center gap-2 z-10">
              {done ? (
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
                  <Check className="h-4 w-4" strokeWidth={3} />
                </div>
              ) : active ? (
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg ambient-shadow ring-4 ring-primary/10">
                  {step.id}
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 text-muted-foreground flex items-center justify-center font-bold text-sm">
                  {step.id}
                </div>
              )}
              <span
                className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest ${
                  active ? 'text-primary' : done ? 'text-muted-foreground' : 'text-muted-foreground/60'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Mini Calendar ─────────────────────────────────────────────────────────────

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

function MiniCalendar({ selected, onSelect, maxDays = 30, nonWorkingDays = [] }) {
  const [viewDate, setViewDate] = useState(startOfMonth(new Date()));

  const today = startOfDay(new Date());
  const maxDate = addDays(today, maxDays);
  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Padding: Monday = 0, ..., Sunday = 6
  const firstDayOfWeek = (getDay(monthStart) + 6) % 7; // convert Sun=0 to Mon=0

  const prevMonth = () => setViewDate((d) => subMonths(d, 1));
  const nextMonth = () => setViewDate((d) => addMonths(d, 1));

  const isPrevDisabled = isBefore(endOfMonth(subMonths(viewDate, 1)), today);
  const isNextDisabled = isBefore(maxDate, startOfMonth(addMonths(viewDate, 1)));

  return (
    <div className="bg-card rounded-xl p-5 ambient-shadow border border-border/20">
      {/* Month header */}
      <div className="flex items-center justify-between mb-5">
        <span className="font-bold text-foreground capitalize">
          {format(viewDate, 'MMMM yyyy', { locale: es })}
        </span>
        <div className="flex gap-1">
          <button
            onClick={prevMonth}
            disabled={isPrevDisabled}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={nextMonth}
            disabled={isNextDisabled}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-y-3 text-center mb-1">
        {DIAS.map((d) => (
          <div key={d} className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-tighter">
            {d}
          </div>
        ))}

        {/* Empty cells */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {/* Day cells */}
        {days.map((day) => {
          const isPast = isBefore(day, today);
          const isTooFar = isBefore(maxDate, day);
          // getDay(): 0=domingo, 1=lunes, ..., 6=sábado
          const isNonWorking = nonWorkingDays.includes(getDay(day));
          const disabled = isPast || isTooFar || isNonWorking;
          const isSelected = selected && isSameDay(day, selected);
          const isCurrentDay = isToday(day);

          return (
            <button
              key={day.toISOString()}
              onClick={() => !disabled && onSelect(day)}
              disabled={disabled}
              className={`py-2 text-sm rounded-lg transition-all font-medium ${
                isSelected
                  ? 'bg-primary text-primary-foreground font-bold shadow-sm'
                  : isCurrentDay && !disabled
                  ? 'bg-primary/10 text-primary font-bold'
                  : disabled
                  ? 'text-muted-foreground/30 cursor-not-allowed'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 1 — Selección de servicio ──────────────────────────────────────────

function Step1({ selectedService, onSelect, onNext }) {
  const { data: servicesData, isLoading } = useServices();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');

  const services = useMemo(() => servicesData?.services ?? servicesData ?? [], [servicesData]);

  const categories = useMemo(() => {
    const cats = ['Todos', ...new Set(services.map((s) => s.categoria).filter(Boolean))];
    return cats;
  }, [services]);

  const filtered = useMemo(() => {
    return services.filter((s) => {
      const matchSearch = !search ||
        s.nombre.toLowerCase().includes(search.toLowerCase()) ||
        (s.descripcion && s.descripcion.toLowerCase().includes(search.toLowerCase()));
      const matchCat = activeCategory === 'Todos' || s.categoria === activeCategory;
      return matchSearch && matchCat && s.activo !== false;
    });
  }, [services, search, activeCategory]);

  return (
    <div className="pb-36 sm:pb-28">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-display text-foreground mb-3">
          Reserva tu cita
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto font-medium text-sm sm:text-base">
          Elige el servicio que deseas. Desde cortes de precisión hasta tratamientos especiales.
        </p>
      </div>

      {/* Search + filter */}
      <div className="max-w-4xl mx-auto mb-8 flex flex-col md:flex-row gap-4 items-stretch md:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar servicio..."
            className="w-full bg-muted border-none rounded-xl py-3 pl-11 pr-4 text-base sm:text-sm outline-none focus:ring-2 focus:ring-primary transition-all placeholder:text-muted-foreground/50"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 w-full md:w-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold tracking-wide transition-colors ${
                activeCategory === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-primary/10 text-muted-foreground hover:bg-primary/20'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Service grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card rounded-xl border border-border/20 p-5 animate-pulse h-40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Scissors className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No hay servicios que coincidan</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filtered.map((service) => {
            const isSelected = selectedService?._id === service._id;
            return (
              <div
                key={service._id}
                onClick={() => onSelect(isSelected ? null : service)}
                className={`group bg-card rounded-xl border p-4 sm:p-5 flex flex-col justify-between cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'border-primary ring-2 ring-primary/20 ambient-shadow'
                    : 'border-border/20 hover:border-primary/30 hover:ambient-shadow'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-1 flex-1 mr-3 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-foreground tracking-tight break-words">{service.nombre}</h3>
                      {service.categoria && (
                        <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">
                          {service.categoria}
                        </span>
                      )}
                    </div>
                    {service.descripcion && (
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {service.descripcion}
                      </p>
                    )}
                  </div>
                  <div className={`p-2 rounded-lg shrink-0 transition-colors ${
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-primary'
                  }`}>
                    <Scissors className="h-4 w-4" />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 mt-auto">
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground/60" />
                      <span className="text-xs font-bold text-foreground">{formatDuration(service.duracion)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Euro className="h-3.5 w-3.5 text-muted-foreground/60" />
                      <span className="text-xs font-black text-foreground">{formatPrice(service.precio)}</span>
                    </div>
                  </div>
                  <div className={`p-2 rounded-lg transition-all active:scale-90 ${
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-primary text-primary-foreground group-hover:brightness-110'
                  }`}>
                    {isSelected
                      ? <Check className="h-4 w-4" strokeWidth={3} />
                      : <span className="text-sm font-black leading-none">+</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="mt-10 sm:mt-12 flex flex-col items-start sm:flex-row sm:items-center sm:justify-between gap-4 pt-8 border-t border-border/20">
        <Link
          to="/"
          className="flex items-center gap-2 text-muted-foreground font-bold text-sm hover:text-primary transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Volver al inicio
        </Link>
        <div className="flex flex-col items-start sm:items-end gap-1">
          <p className="text-xs text-muted-foreground font-medium">Precios sujetos al profesional disponible.</p>
          <p className="text-[10px] text-muted-foreground/50 uppercase tracking-widest font-black">
            Reserva segura · Política de cancelación 24h
          </p>
        </div>
      </div>

      {/* Floating CTA — centrado en móvil, derecha en desktop */}
      <div className="fixed inset-x-4 bottom-4 sm:inset-x-auto sm:bottom-8 sm:right-8 z-50 sm:max-w-lg">
        <button
          onClick={onNext}
          disabled={!selectedService}
          className="w-full sm:w-auto bg-primary text-primary-foreground px-4 sm:px-8 py-4 rounded-2xl font-black tracking-wide shadow-[0_8px_30px_rgba(107,56,212,0.3)] flex items-center justify-between gap-3 text-left transition-all active:scale-95 group disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none hover:brightness-110"
        >
          {selectedService ? `${selectedService.nombre} — Continuar` : 'Selecciona un servicio'}
          <ArrowRight className="h-5 w-5 shrink-0 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}

// ─── Step 2 — Fecha y hora ────────────────────────────────────────────────────

function Step2({ selectedService, selectedDate, onSelectDate, selectedSlot, onSelectSlot, onBack, onNext, maxDays, nonWorkingDays, businessTimezone }) {
  const dateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;
  const { data: availData, isLoading: loadingSlots, isFetching } = useAvailability(
    dateStr,
    selectedService?._id
  );
  const [filterProfesional, setFilterProfesional] = useState('');

  const allSlots = useMemo(() => availData?.slots ?? [], [availData]);

  // Profesionales únicos disponibles en los slots
  const uniqueProfessionals = useMemo(() => {
    const map = new Map();
    allSlots.forEach((s) => {
      if (!map.has(s.profesionalId)) {
        map.set(s.profesionalId, { id: s.profesionalId, nombre: s.profesionalNombre, color: s.profesionalColor });
      }
    });
    return [...map.values()];
  }, [allSlots]);

  // Filtrar slots por profesional seleccionado
  const slots = useMemo(() => {
    if (!filterProfesional) return allSlots;
    return allSlots.filter((s) => s.profesionalId === filterProfesional);
  }, [allSlots, filterProfesional]);

  const dateLabel = selectedDate
    ? format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
    : null;

  return (
    <div className="pb-36 sm:pb-28">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

        {/* Left: Calendar */}
        <div className="lg:col-span-5 bg-muted p-5 sm:p-6 md:p-8 rounded-xl space-y-6">
          <div>
            <h2 className="text-2xl font-black text-foreground tracking-display">Selecciona fecha</h2>
            <p className="text-muted-foreground text-sm font-medium mt-1">Elige el día de tu cita.</p>
          </div>

          <MiniCalendar selected={selectedDate} onSelect={onSelectDate} maxDays={maxDays} nonWorkingDays={nonWorkingDays} />

          {/* Currently selected */}
          {selectedDate && (
            <div className="bg-background rounded-xl border border-border/20 p-4 flex items-start sm:items-center gap-4">
              <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Fecha seleccionada
                </p>
                <p className="font-black text-foreground capitalize text-sm">{dateLabel}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Time slots */}
        <div className="lg:col-span-7 space-y-6">
          <div>
            <h2 className="text-2xl font-black text-foreground tracking-display">Horas disponibles</h2>
            <p className="text-muted-foreground text-sm font-medium mt-1">
              {selectedDate
                ? 'Slots actualizados en tiempo real para la fecha seleccionada.'
                : 'Selecciona primero una fecha en el calendario.'}
            </p>
            {businessTimezone && (
              <p className="text-xs text-muted-foreground/70 mt-1 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Horarios en zona horaria: {businessTimezone}
              </p>
            )}
          </div>

          {/* Filtro por profesional */}
          {selectedDate && uniqueProfessionals.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilterProfesional('')}
                className={`px-4 py-2 rounded-full text-xs font-bold tracking-wide transition-colors ${
                  !filterProfesional
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-primary/10 text-muted-foreground hover:bg-primary/20'
                }`}
              >
                Todos
              </button>
              {uniqueProfessionals.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setFilterProfesional(p.id)}
                  className={`px-4 py-2 rounded-full text-xs font-bold tracking-wide transition-colors flex items-center gap-2 ${
                    filterProfesional === p.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-primary/10 text-muted-foreground hover:bg-primary/20'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: filterProfesional === p.id ? 'rgba(255,255,255,0.8)' : p.color || '#6b38d4' }}
                  />
                  {p.nombre}
                </button>
              ))}
            </div>
          )}

          {!selectedDate ? (
            <div className="text-center py-16 text-muted-foreground border-2 border-dashed border-border/30 rounded-xl">
              <CalendarCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-sm">Selecciona una fecha para ver disponibilidad</p>
            </div>
          ) : loadingSlots || isFetching ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-24 bg-card rounded-xl border border-border/20 animate-pulse" />
              ))}
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground border-2 border-dashed border-border/30 rounded-xl">
              <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-sm">No hay huecos disponibles para este día</p>
              <p className="text-xs mt-1">Prueba con otra fecha</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {slots.map((slot, idx) => {
                const isSelected =
                  selectedSlot &&
                  selectedSlot.hora === slot.hora &&
                  selectedSlot.profesionalId === slot.profesionalId;
                return (
                  <button
                    key={`${slot.hora}-${slot.profesionalId}-${idx}`}
                    onClick={() => onSelectSlot(slot)}
                    className={`group p-4 md:p-5 rounded-xl text-left flex flex-col gap-2.5 relative overflow-hidden transition-all duration-200 ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-2 border-primary ring-4 ring-primary/10'
                        : 'bg-card border border-border/20 hover:border-primary/30 hover:ambient-shadow'
                    }`}
                  >
                    <span className={`text-lg font-black tracking-tight ${isSelected ? 'text-primary-foreground' : 'text-foreground'}`}>
                      {slot.hora}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{
                          backgroundColor: isSelected
                            ? 'rgba(255,255,255,0.8)'
                            : slot.profesionalColor || '#6b38d4',
                        }}
                      />
                      <span className={`text-xs font-bold uppercase truncate ${isSelected ? 'text-primary-foreground/90' : 'text-muted-foreground'}`}>
                        {slot.profesionalNombre}
                      </span>
                    </div>
                    {isSelected && (
                      <div className="absolute bottom-2 right-2">
                        <Check className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Footer nav */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-6 border-t border-border/20 mt-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-muted-foreground font-bold hover:text-primary transition-colors group text-sm"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              Volver a servicios
            </button>
          </div>
        </div>
      </div>

      {/* Botón flotante de continuar — centrado en móvil */}
      {selectedSlot && (
        <div className="fixed inset-x-4 bottom-4 sm:inset-x-auto sm:bottom-8 sm:right-8 z-50 sm:max-w-lg">
          <button
            onClick={onNext}
            className="w-full sm:w-auto bg-primary text-primary-foreground px-4 sm:px-8 py-4 rounded-2xl font-black tracking-wide shadow-[0_8px_30px_rgba(107,56,212,0.3)] flex items-center justify-between gap-3 text-left transition-all active:scale-95 group hover:brightness-110"
          >
            {selectedSlot.hora} — {selectedSlot.profesionalNombre} · Continuar
            <ArrowRight className="h-5 w-5 shrink-0 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Step 3 — Confirmación ────────────────────────────────────────────────────

function Step3({ selectedService, selectedDate, selectedSlot, notes, onNotesChange, onBack, onConfirm, isPending, error, businessTimezone }) {
  const dateLabel = selectedDate
    ? format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
    : '';

  const inicialProfesional = selectedSlot?.profesionalNombre
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '??';

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Left: Summary + notes */}
        <div className="lg:col-span-7 space-y-6">
          <header>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-display text-foreground mb-2">
              Confirmación final
            </h1>
            <p className="text-muted-foreground">
              Revisa los detalles de tu cita y añade cualquier indicación para el profesional.
            </p>
          </header>

          {/* Detail card */}
          <div className="bg-muted rounded-xl p-5 sm:p-6 md:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Service */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Servicio</span>
                <p className="text-lg font-bold text-foreground">{selectedService?.nombre}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDuration(selectedService?.duracion)}
                  {selectedService?.categoria && ` · ${selectedService.categoria}`}
                </p>
              </div>

              {/* Professional */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Profesional</span>
                <div className="flex items-center gap-3 mt-1">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white shrink-0"
                    style={{ backgroundColor: selectedSlot?.profesionalColor || '#6b38d4' }}
                  >
                    {inicialProfesional}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{selectedSlot?.profesionalNombre}</p>
                    <p className="text-xs text-muted-foreground">Profesional asignado</p>
                  </div>
                </div>
              </div>

              {/* Date & Time */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Fecha y hora</span>
                <div className="flex items-center gap-2 text-foreground mt-1">
                  <CalendarCheck className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-sm font-bold capitalize break-words">{dateLabel}</p>
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  <Clock className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-sm font-bold">
                    {selectedSlot?.hora} — {selectedSlot?.horaFinOperativa ?? selectedSlot?.horaFin}
                  </p>
                </div>
                {businessTimezone && (
                  <p className="text-[10px] text-muted-foreground/70 ml-6">
                    Zona horaria: {businessTimezone}
                  </p>
                )}
              </div>

              {/* Price */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Precio</span>
                <p className="text-2xl sm:text-3xl font-black text-foreground">{formatPrice(selectedService?.precio)}</p>
                <p className="text-xs text-muted-foreground italic">Pago en el establecimiento</p>
              </div>
            </div>

            {/* Notes */}
            <div className="pt-6 border-t border-border/20">
              <label className="block text-[10px] font-bold text-primary uppercase tracking-widest mb-3">
                Notas para el profesional (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                rows={4}
                placeholder="Cuéntanos tus preferencias, tipo de cabello o lo que desees conseguir..."
                className="w-full bg-card border border-border/20 rounded-xl p-4 text-base sm:text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
              />
            </div>
          </div>
        </div>

        {/* Right: Price card (sticky on desktop) */}
        <div className="lg:col-span-5 lg:sticky lg:top-24">
          <div className="bg-card rounded-xl overflow-hidden ambient-shadow border border-border/20">
            {/* Decorative header */}
            <div className="h-2 bg-gradient-to-r from-primary to-primary/50" />
            <div className="p-6 md:p-8 space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{selectedService?.nombre}</span>
                  <span className="font-bold text-foreground">{formatPrice(selectedService?.precio)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tarifa de reserva</span>
                  <span className="text-primary font-medium">Gratuita</span>
                </div>
                <div className="pt-4 border-t border-border/20 flex justify-between items-center">
                  <span className="font-extrabold text-foreground">Total</span>
                  <span className="text-2xl font-black text-primary">{formatPrice(selectedService?.precio)}</span>
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-3 font-medium">
                  {error?.response?.data?.error || error?.response?.data?.message || 'Error al crear la cita. Inténtalo de nuevo.'}
                </p>
              )}

              <button
                onClick={onConfirm}
                disabled={isPending}
                className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold text-base ambient-shadow hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <span className="h-5 w-5 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                ) : (
                  <>
                    Confirmar reserva
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              <p className="text-[10px] text-center text-muted-foreground/70 leading-relaxed">
                Al confirmar, aceptas nuestra política de cancelación con 24h de antelación.
              </p>
            </div>
          </div>

          <button
            onClick={onBack}
            className="mt-4 w-full text-muted-foreground text-sm font-bold hover:text-primary transition-colors py-2 flex items-center justify-center gap-2 group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Cambiar horario
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BookingPage() {
  const navigate = useNavigate();
  const { data: settings } = useSettings();
  const { data: servicesData } = useServices();
  const { data: professionals } = useProfessionals();
  const createAppointment = useCreateAppointment();

  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [notes, setNotes] = useState('');

  const maxDays = settings?.diasMaximosReserva ?? 30;
  const businessTimezone = settings?.zonaHoraria || 'Europe/Madrid';
  const activeServices = useMemo(
    () => (servicesData?.services ?? servicesData ?? []),
    [servicesData]
  );
  const selectedDateKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;
  const { data: liveAvailabilityData } = useAvailability(selectedDateKey, selectedService?._id);
  const liveSlots = useMemo(() => liveAvailabilityData?.slots ?? [], [liveAvailabilityData]);

  // Calcular días no laborables (días donde NINGÚN profesional trabaja)
  const nonWorkingDays = useMemo(() => {
    if (!professionals || professionals.length === 0) return [];
    const daysOfWeek = [0, 1, 2, 3, 4, 5, 6]; // 0=dom, 1=lun, ..., 6=sab
    return daysOfWeek.filter((day) =>
      professionals.every((prof) => {
        const schedule = prof.horarioSemanal?.[day];
        return !schedule || !schedule.activo;
      })
    );
  }, [professionals]);

  useEffect(() => {
    if (!selectedService || servicesData === undefined) return;

    const serviceStillAvailable = activeServices.some((service) => service._id === selectedService._id);

    if (serviceStillAvailable) return;

    const resetId = window.setTimeout(() => {
      setSelectedService(null);
      setSelectedDate(null);
      setSelectedSlot(null);
      setStep(1);
      notifyInfo(
        'El servicio ya no está disponible',
        'Hemos actualizado la reserva para que elijas una opción válida.'
      );
    }, 0);

    return () => window.clearTimeout(resetId);
  }, [activeServices, selectedService, servicesData]);

  useEffect(() => {
    if (!selectedService || !selectedDate || !selectedSlot) return;
    if (!Array.isArray(professionals) || liveAvailabilityData === undefined) return;

    const professionalStillActive = professionals?.some(
      (professional) => professional._id === selectedSlot.profesionalId && professional.activo !== false
    );
    const slotStillAvailable = liveSlots.some(
      (slot) => slot.hora === selectedSlot.hora && slot.profesionalId === selectedSlot.profesionalId
    );

    if (professionalStillActive && slotStillAvailable) return;

    const resetId = window.setTimeout(() => {
      setSelectedSlot(null);

      if (step > 2) {
        setStep(2);
      }

      notifyInfo(
        'La disponibilidad ha cambiado',
        'El horario seleccionado ya no está disponible. Elige otro para continuar.'
      );
    }, 0);

    return () => window.clearTimeout(resetId);
  }, [liveAvailabilityData, liveSlots, professionals, selectedDate, selectedService, selectedSlot, step]);

  function handleSelectDate(date) {
    setSelectedDate(date);
    setSelectedSlot(null); // reset slot when date changes
  }

  async function handleConfirm() {
    if (!selectedService || !selectedDate || !selectedSlot) return;

    const businessTz = settings?.zonaHoraria || 'Europe/Madrid';
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const fechaHoraInicio = buildFechaHoraInicio(dateStr, selectedSlot.hora, businessTz);
    const payload = {
      servicioId: selectedService._id,
      fechaHoraInicio,
      profesionalId: selectedSlot.profesionalId,
      ...(notes.trim() && { notasCliente: notes.trim() }),
    };

    createAppointment.mutate(payload, {
      onSuccess: (data) => {
        navigate('/booking/confirmed', { state: { appointment: data.appointment ?? data } });
      },
    });
  }

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 md:py-12">
        <Stepper currentStep={step} />

        {step === 1 && (
          <Step1
            selectedService={selectedService}
            onSelect={setSelectedService}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <Step2
            selectedService={selectedService}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            selectedSlot={selectedSlot}
            onSelectSlot={setSelectedSlot}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
            maxDays={maxDays}
            nonWorkingDays={nonWorkingDays}
            businessTimezone={businessTimezone}
          />
        )}

        {step === 3 && (
          <Step3
            selectedService={selectedService}
            selectedDate={selectedDate}
            selectedSlot={selectedSlot}
            notes={notes}
            onNotesChange={setNotes}
            onBack={() => setStep(2)}
            onConfirm={handleConfirm}
            isPending={createAppointment.isPending}
            error={createAppointment.error}
            businessTimezone={businessTimezone}
          />
        )}
      </div>
    </div>
  );
}
