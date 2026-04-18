const XSS_PATTERNS = [/<script[\s\S]*?>[\s\S]*?<\/script>/gi,/javascript\s*:/gi,/on\w+\s*=/gi,/<\s*iframe/gi,/document\.cookie/gi,/eval\s*\(/gi];

export function sanitizeInput(input: string): string {
  if (!input) return '';
  let out = input.trim();
  XSS_PATTERNS.forEach(p => { out = out.replace(p, ''); });
  return out;
}

export function isValidUsername(value: string): boolean {
  return /^[a-zA-Z0-9_\u00C0-\u024F]{3,20}$/.test(value.trim());
}

export function isValidWord(value: string): boolean {
  return /^[a-zA-Z\u011F\u00FC\u015F\u0131\u00F6\u00E7\u011E\u00DC\u015E\u0130\u00D6\u00C7]{3,10}$/.test(value.trim());
}

export function isValidMessage(value: string, maxLen = 1000): boolean {
  const t = value.trim();
  if (t.length < 5 || t.length > maxLen) return false;
  return !XSS_PATTERNS.some(p => p.test(t));
}
