// Feature flags (URL param wins over localStorage).
// ?engine=babylon or ?engine=three
// ?program=calm10
export function getEnginePreference() {
  const url = new URL(window.location.href);
  const p = (url.searchParams.get('engine') || '').toLowerCase();
  if (p === 'babylon' || p === 'three') {
    localStorage.setItem('luma_engine', p);
    return p;
  }
  return (localStorage.getItem('luma_engine') || 'three').toLowerCase();
}

export function getProgramPreference() {
  const url = new URL(window.location.href);
  const p = (url.searchParams.get('program') || '').toLowerCase();
  if (p) return p;
  return '';
}