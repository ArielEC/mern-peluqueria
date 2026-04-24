import useUIStore from '@/stores/uiStore';

export function notify({
  type = 'info',
  title,
  description = '',
  duration,
}) {
  if (!title) return;

  useUIStore.getState().addNotification({
    type,
    title,
    description,
    duration,
  });
}

export function notifySuccess(title, description = '', duration = 3200) {
  notify({ type: 'success', title, description, duration });
}

export function notifyError(title, description = '', duration = 4800) {
  notify({ type: 'error', title, description, duration });
}

export function notifyInfo(title, description = '', duration = 3600) {
  notify({ type: 'info', title, description, duration });
}

export function getFirstValidationError(errors, fallback = 'Revisa los campos del formulario') {
  if (!errors) return fallback;

  if (typeof errors === 'string') {
    return errors;
  }

  if (Array.isArray(errors)) {
    return errors.find(Boolean) || fallback;
  }

  if (typeof errors === 'object') {
    return Object.values(errors).find((value) => typeof value === 'string' && value.trim()) || fallback;
  }

  return fallback;
}

export function notifyValidationError(
  errors,
  title = 'Revisa el formulario',
  fallback = 'Corrige los campos marcados para continuar'
) {
  notifyError(title, getFirstValidationError(errors, fallback));
}

export function getErrorMessage(error, fallback = 'No se ha podido completar la acción') {
  return error?.response?.data?.razon
    || error?.response?.data?.error
    || error?.message
    || fallback;
}
