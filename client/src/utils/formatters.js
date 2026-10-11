export function formatFCFA(amount, separator = ' ') {
  if (amount === null || amount === undefined || isNaN(amount)) return '0 FCFA';
  const num = Math.round(Number(amount));
  const parts = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  return `${parts} FCFA`;
}

export function formatPercent(percent) {
  if (percent === null || percent === undefined || isNaN(percent)) return '0,0%';
  const num = Number(percent);
  return `${num.toFixed(1).replace('.', ',')}%`;
}

const MONTHS_FR = [
  'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
  'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'
];

const MONTHS_FULL_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export function formatDateLabel(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const day = parts[2];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const year = parts[0];
  return `${day} ${MONTHS_FULL_FR[monthIdx] || parts[1]} ${year}`;
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const day = parts[2];
  const monthIdx = parseInt(parts[1], 10) - 1;
  return `${day} ${MONTHS_FR[monthIdx] || parts[1]}`;
}
