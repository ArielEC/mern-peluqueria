export function scrollViewportToTop() {
  if (typeof window === 'undefined') return;

  window.scrollTo({ top: 0, left: 0 });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}
