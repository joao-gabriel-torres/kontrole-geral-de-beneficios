/** Geometria dos ícones do protótipo (docs/design/assets/icons). viewBox 24, traço 1.5, pontas arredondadas. */
export const GEOMETRIA_ICONES = {
  camera:
    '<path d="M14.5 4h-5L8 6.5H5a2 2 0 0 0-2 2V18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5a2 2 0 0 0-2-2h-3Z"/><circle cx="12" cy="13" r="3.5"/>',
  'cancel-circle': '<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
  cancel: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  'check-done': '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.2 2.4 2.3 4.6-4.9"/>',
  check: '<path d="M5 12.5 9.5 17 19 7"/>',
  'chevron-right': '<path d="m9 5 7 7-7 7"/>',
  dashboard:
    '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
  'date-time':
    '<rect x="3" y="4.5" width="18" height="16.5" rx="3"/><path d="M8 2.5v4"/><path d="M16 2.5v4"/><path d="M3 10h18"/>',
  description:
    '<path d="M9 4.5H7a2 2 0 0 0-2 2V19a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6.5a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="3" rx="1"/><path d="M9 12h6"/><path d="M9 16h4"/>',
  download:
    '<path d="M12 3.5v11"/><path d="m7.5 10 4.5 4.5 4.5-4.5"/><path d="M4 17.5V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1.5"/>',
  image:
    '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="1.8"/><path d="m21 15-4.5-4.5L6 21"/>',
  member:
    '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8"/><path d="M18.5 14.5a6.5 6.5 0 0 1 3 5.5"/>',
  pin: '<path d="M19 10c0 5-7 11.5-7 11.5S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  priority: '<path d="M3.5 12a8.5 8.5 0 1 0 2.5-6L3.5 8.5"/><path d="M3.5 3.5v5h5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  settings:
    '<path d="m3.5 7 1.8 1.8L8.5 5.5"/><path d="m3.5 16 1.8 1.8 3.2-3.3"/><path d="M12 7h8.5"/><path d="M12 16h8.5"/>',
  sheet:
    '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M3.5 9.5h17"/><path d="M3.5 15h17"/><path d="M9.5 9.5v11"/>',
  trash:
    '<path d="M4 6.5h16"/><path d="M9.5 6.5V4.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2"/><path d="M6 6.5 7 19a2 2 0 0 0 2 1.8h6a2 2 0 0 0 2-1.8l1-12.5"/>',
  upload:
    '<path d="M12 14.5v-11"/><path d="m7.5 8 4.5-4.5L16.5 8"/><path d="M4 17.5V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1.5"/>',
} as const

export type NomeIcone = keyof typeof GEOMETRIA_ICONES
