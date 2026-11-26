function trainingDateParts(date) {
  const [day, month, year] = date.split(/[/.-]/);
  return { day, month, year: year.length === 2 ? `20${year}` : year };
}

export function isValidTrainingDate(value) {
  if (typeof value !== 'string') return false;
  const date = value.trim();
  if (!/^\d{1,2}([/.-])\d{1,2}\1(?:\d{2}|\d{4})$/.test(date)) return false;
  const { day, month, year } = trainingDateParts(date);
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return parsed.getUTCFullYear() === Number(year) &&
    parsed.getUTCMonth() + 1 === Number(month) && parsed.getUTCDate() === Number(day);
}

export function parseTrainingDate(date) {
  const { day, month, year } = trainingDateParts(date);
  return new Date(Number(year), Number(month) - 1, Number(day));
}

// Charts historically parse padded dates as UTC. Keep weekly totals and labels
// compatible with existing charts while calendar and form dates stay local.
export function parseChartDate(date) {
  const { day, month, year } = trainingDateParts(date);
  return new Date(`${year}-${month}-${day}`);
}

export function parseDateInput(date) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDateInput(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function inputToDisplayDate(value) {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

export function formatDisplayDate(date) {
  return inputToDisplayDate(formatDateInput(date));
}

export function todayInputValue() {
  return formatDateInput(new Date());
}
