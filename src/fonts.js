import './fonts.css';

let cyrillic = false;
export function loadCyrillicFonts() {
  if (cyrillic) return;
  cyrillic = true;
  import('./fonts-cyrillic.css');
}
