const COUNTRY_PREFIXES: { code: string; minLength: number }[] = [
  { code: '966', minLength: 9 },
  { code: '971', minLength: 9 },
  { code: '965', minLength: 8 },
  { code: '974', minLength: 8 },
  { code: '973', minLength: 8 },
  { code: '968', minLength: 8 },
  { code: '962', minLength: 9 },
  { code: '963', minLength: 9 },
  { code: '964', minLength: 10 },
  { code: '961', minLength: 8 },
  { code: '967', minLength: 9 },
  { code: '20', minLength: 10 },
  { code: '212', minLength: 9 },
  { code: '213', minLength: 9 },
  { code: '216', minLength: 8 },
  { code: '218', minLength: 8 },
  { code: '234', minLength: 10 },
  { code: '254', minLength: 9 },
  { code: '255', minLength: 9 },
  { code: '256', minLength: 9 },
  { code: '260', minLength: 9 },
  { code: '263', minLength: 9 },
  { code: '27', minLength: 9 },
  { code: '44', minLength: 10 },
  { code: '49', minLength: 10 },
  { code: '33', minLength: 9 },
  { code: '34', minLength: 9 },
  { code: '39', minLength: 10 },
  { code: '31', minLength: 9 },
  { code: '32', minLength: 9 },
  { code: '46', minLength: 9 },
  { code: '47', minLength: 8 },
  { code: '45', minLength: 8 },
  { code: '48', minLength: 9 },
  { code: '351', minLength: 9 },
  { code: '352', minLength: 8 },
  { code: '353', minLength: 9 },
  { code: '358', minLength: 9 },
  { code: '359', minLength: 9 },
  { code: '36', minLength: 9 },
  { code: '30', minLength: 10 },
  { code: '40', minLength: 9 },
  { code: '41', minLength: 9 },
  { code: '43', minLength: 10 },
  { code: '420', minLength: 9 },
  { code: '421', minLength: 9 },
  { code: '385', minLength: 9 },
  { code: '386', minLength: 8 },
  { code: '61', minLength: 9 },
  { code: '64', minLength: 9 },
  { code: '62', minLength: 9 },
  { code: '63', minLength: 10 },
  { code: '60', minLength: 9 },
  { code: '65', minLength: 8 },
  { code: '66', minLength: 9 },
  { code: '84', minLength: 9 },
  { code: '81', minLength: 10 },
  { code: '82', minLength: 9 },
  { code: '86', minLength: 11 },
  { code: '852', minLength: 8 },
  { code: '853', minLength: 8 },
  { code: '886', minLength: 9 },
  { code: '91', minLength: 10 },
  { code: '92', minLength: 10 },
  { code: '880', minLength: 10 },
  { code: '94', minLength: 9 },
  { code: '95', minLength: 9 },
  { code: '98', minLength: 10 },
  { code: '90', minLength: 10 },
  { code: '7', minLength: 10 },
  { code: '1', minLength: 10 },
  { code: '52', minLength: 10 },
  { code: '55', minLength: 10 },
  { code: '56', minLength: 9 },
  { code: '57', minLength: 10 },
  { code: '51', minLength: 9 },
  { code: '54', minLength: 10 },
  { code: '58', minLength: 10 },
];

export function sanitizePhone(phone: string): string {
  if (!phone) return '';

  const cleaned = phone.replace(/[^0-9+]/g, '');

  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  if (cleaned.startsWith('00')) {
    return '+' + cleaned.slice(2);
  }

  if (cleaned.startsWith('0')) {
    const rest = cleaned.slice(1);
    const match = matchCountryPrefix(rest);
    if (match) return '+' + match + rest.slice(match.length);
    return '+966' + rest;
  }

  if (cleaned.length >= 8) {
    const match = matchCountryPrefix(cleaned);
    if (match) return '+' + cleaned;
  }

  return '+966' + cleaned;
}

function matchCountryPrefix(digits: string): string | null {
  const sorted = [...COUNTRY_PREFIXES].sort((a, b) => b.code.length - a.code.length);
  for (const { code, minLength } of sorted) {
    if (digits.startsWith(code) && digits.length >= minLength + code.length - 1) {
      return code;
    }
  }
  return null;
}

export function whatsappLink(phone: string, text?: string): string {
  const sanitized = sanitizePhone(phone);
  const digits = sanitized.replace(/\D/g, '');
  const base = `https://wa.me/${digits}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function openWhatsApp(phone: string, text?: string): void {
  const url = whatsappLink(phone, text);
  window.open(url, '_blank', 'noopener,noreferrer');
}
