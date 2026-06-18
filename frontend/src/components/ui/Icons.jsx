// Ícones inline minimalistas (stroke-based, seguem o estilo da demo).
// Mantidos como componentes simples para não depender de uma lib externa.

const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 };

export const IconDashboard = (p) => (
  <svg {...base} {...p}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
);

export const IconAlert = (p) => (
  <svg {...base} {...p}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
);

export const IconBox = (p) => (
  <svg {...base} {...p}><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>
);

export const IconUsers = (p) => (
  <svg {...base} {...p}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
);

export const IconPlug = (p) => (
  <svg {...base} {...p}><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
);

export const IconBell = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M18 12h2M17.66 17.66l-1.41-1.41M12 18v2M6.34 17.66l1.41-1.41M6 12H4M6.34 6.34l1.41 1.41"/></svg>
);

export const IconPlus = (p) => (
  <svg {...base} strokeWidth={2.5} {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
);

export const IconSync = (p) => (
  <svg {...base} {...p}><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
);

export const IconAlertTriangle = (p) => (
  <svg {...base} {...p}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
);

export const IconAlertCircle = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
);

export const IconCheck = (p) => (
  <svg {...base} {...p}><polyline points="20 6 9 17 4 12"/></svg>
);

export const IconChevronLeft = (p) => (
  <svg {...base} {...p}><polyline points="15 18 9 12 15 6"/></svg>
);

export const IconLogout = (p) => (
  <svg {...base} {...p}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
);

export const IconDownload = (p) => (
  <svg {...base} {...p}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
);
