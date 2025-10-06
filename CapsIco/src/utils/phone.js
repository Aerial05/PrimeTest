// Utilities for strict PH (+63) phone handling
// Display: +63 9XX XXX XXXX
// E.164: +639XXXXXXXXX (10 digits after 63, first must be 9)

export function formatPHDisplay(value) {
  const digits = String(value || '').replace(/\D/g, '');
  let rest = digits;
  if (rest.startsWith('63')) rest = rest.slice(2);
  else if (rest.startsWith('0')) rest = rest.slice(1);
  // enforce leading 9 for PH mobile and slice to 10 digits
  if (rest && rest[0] !== '9') rest = rest.replace(/^(?!9)/, '');
  rest = rest.slice(0, 10);
  const p1 = rest.slice(0, 3);
  const p2 = rest.slice(3, 6);
  const p3 = rest.slice(6, 10);
  const tail = [p1, p2, p3].filter(Boolean).join(' ');
  return '+63 ' + tail;
}

export function toE164PH(value) {
  const digits = String(value || '').replace(/\D/g, '');
  let rest = digits;
  if (rest.startsWith('63')) rest = rest.slice(2);
  else if (rest.startsWith('0')) rest = rest.slice(1);
  if (!rest) return '';
  // normalize and trim
  rest = rest.slice(0, 10);
  return '+63' + rest;
}

export function isValidE164PH(e164) {
  return /^\+639\d{9}$/.test(String(e164 || ''));
}

export function digitsCount(value) {
  return (String(value || '').match(/\d/g) || []).length;
}
