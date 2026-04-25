/**
 * AdminTable — tabla reutilizable con header, búsqueda, botón de acción y paginación.
 * Sigue el diseño violet-slate del Stitch.
 */
export function AdminPageHeader({ title, subtitle, actionLabel, actionIcon = 'add', onAction, searchValue, onSearch, searchPlaceholder = 'Buscar...' }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
      <div>
        <h2 className="text-[1.75rem] sm:text-[2rem] font-extrabold tracking-tight text-[#131b2e] leading-tight">{title}</h2>
        {subtitle && <p className="text-[0.875rem] text-[#494454] mt-1">{subtitle}</p>}
      </div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
        {onSearch !== undefined && (
          <div className="relative w-full sm:w-auto">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#494454]">search</span>
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-10 pr-4 py-2.5 bg-[#eaedff] border-0 rounded-xl text-base sm:text-[0.875rem] text-[#131b2e] w-full sm:w-64 outline-none focus:ring-2 focus:ring-[#6b38d4] placeholder:text-[#494454]/50"
            />
          </div>
        )}
        {onAction && (
          <button
            onClick={onAction}
            className="flex items-center justify-center gap-2 bg-[#6b38d4] text-white px-5 py-2.5 rounded-xl font-bold text-[0.875rem] hover:brightness-110 active:scale-95 transition-all shadow-sm shadow-[#6b38d4]/20"
          >
            <span className="material-symbols-outlined text-[20px]">{actionIcon}</span>
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export function AdminTable({
  columns,
  rows,
  loading,
  emptyIcon = 'inbox',
  emptyText = 'No hay datos',
  getRowProps,
}) {
  return (
    <div className="bg-[#f2f3ff] rounded-xl overflow-hidden p-1 shadow-[0_12px_40px_-12px_hsla(262,83%,10%,0.08)]">
      <div className="bg-white rounded-[0.625rem] overflow-hidden border border-[#cbc3d7]/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f2f3ff]/60 border-b border-[#cbc3d7]/15">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 sm:px-6 py-3.5 sm:py-4 text-[0.7rem] font-bold uppercase tracking-wider text-[#494454] ${col.className ?? ''}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#cbc3d7]/10">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 sm:px-6 py-4 sm:py-5">
                        <div className="h-4 bg-[#f2f3ff] rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 sm:px-6 py-16 text-center text-[#494454]">
                    <span className="material-symbols-outlined text-4xl text-[#cbc3d7] block mb-2">{emptyIcon}</span>
                    <p className="text-[0.875rem]">{emptyText}</p>
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => {
                  const rowProps = getRowProps?.(row) ?? {};
                  const { className: rowClassName = '', ...restRowProps } = rowProps;

                  return (
                    <tr
                      key={row.id ?? i}
                      className={`bg-white hover:bg-[#f2f3ff]/40 transition-colors ${rowClassName}`}
                      {...restRowProps}
                    >
                      {columns.map((col) => (
                        <td key={col.key} className={`px-4 sm:px-6 py-4 ${col.cellClassName ?? ''}`}>
                          {col.render ? col.render(row) : row[col.key]}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function ActionButtons({ onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-end gap-1">
      {onEdit && (
        <button
          onClick={onEdit}
          className="p-2 rounded-lg text-[#494454] hover:text-[#6b38d4] hover:bg-[#6b38d4]/10 transition-colors"
          title="Editar"
        >
          <span className="material-symbols-outlined text-[20px]">edit</span>
        </button>
      )}
      {onDelete && (
        <button
          onClick={onDelete}
          className="p-2 rounded-lg text-[#494454] hover:text-[#ba1a1a] hover:bg-[#ba1a1a]/10 transition-colors"
          title="Eliminar"
        >
          <span className="material-symbols-outlined text-[20px]">delete</span>
        </button>
      )}
    </div>
  );
}

export function StatusToggle({ active, onChange }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={active} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
      <div className="w-10 h-5 bg-[#cbc3d7]/40 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#6b38d4]" />
    </label>
  );
}

export function ConfirmDeleteModal({ open, title, description, error, onConfirm, onCancel, isPending }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-[#131b2e]/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm bg-white rounded-xl shadow-2xl z-10 overflow-hidden">
        <div className="h-1 bg-[#ba1a1a]" />
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#ffdad6] flex items-center justify-center text-[#ba1a1a] shrink-0">
              <span className="material-symbols-outlined text-[20px]">delete_forever</span>
            </div>
            <div>
              <h3 className="font-bold text-[#131b2e]">{title}</h3>
              <p className="text-[0.75rem] text-[#494454]">{description}</p>
            </div>
          </div>
          {error && (
            <div className="mb-4 rounded-lg bg-[#ffdad6] px-4 py-3 text-[0.8rem] font-medium text-[#93000a]">
              {error}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg border border-[#cbc3d7]/40 text-[#494454] font-bold text-[0.875rem] hover:bg-[#f2f3ff]">
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              disabled={isPending}
              className="flex-1 py-2.5 rounded-lg bg-[#ba1a1a] text-white font-bold text-[0.875rem] hover:brightness-110 disabled:opacity-60 flex items-center justify-center"
            >
              {isPending ? <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : 'Eliminar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminModal({ open, onClose, title, subtitle, accentColor = '#6b38d4', children, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-[#131b2e]/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl z-10 overflow-hidden flex flex-col max-h-[calc(100vh-1.5rem)]">
        <div className="h-1 shrink-0" style={{ backgroundColor: accentColor }} />
        <div className="p-5 sm:p-6 border-b border-[#cbc3d7]/20 flex items-center justify-between shrink-0 gap-3">
          <div>
            <h2 className="font-bold text-[#131b2e]">{title}</h2>
            {subtitle && <p className="text-[0.75rem] text-[#494454]">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f2f3ff] text-[#494454]">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="p-5 sm:p-6 pt-0 shrink-0 flex flex-col sm:flex-row gap-3">{footer}</div>}
      </div>
    </div>
  );
}

export function FormField({ label, error, required, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-bold uppercase tracking-widest text-[#494454]">
        {label}{required && <span className="text-[#ba1a1a] ml-1">*</span>}
      </label>
      {children}
      {error && <p className="text-[11px] text-[#ba1a1a] font-medium">{error}</p>}
    </div>
  );
}
