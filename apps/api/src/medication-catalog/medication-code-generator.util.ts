/**
 * Archivo: medication-code-generator.util.ts
 * Ruta: apps/api/src/medication-catalog/medication-code-generator.util.ts
 * Funcion: Genera codigo maestro HCELM y SKU empresa para productos de farmacia/drogueria.
 */

export function normalizeCodePart(value?: string | null) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function resolveProductTypePrefix(productType?: string | null) {
  const type = normalizeCodePart(productType);

  if (type === 'MEDICAMENTO') return 'MED';
  if (type === 'MATERIAL_MEDICO') return 'MAT';
  if (type === 'DISPOSITIVO_MEDICO') return 'DIS';
  if (type === 'PRODUCTO_SANITARIO') return 'SAN';
  if (type === 'COSMETICO') return 'COS';

  return 'OTR';
}

export function resolveCompanyPrefix(params: {
  legalName?: string | null;
  tradeName?: string | null;
  ruc?: string | null;
}) {
  const legalName = normalizeCodePart(params.legalName);
  const tradeName = normalizeCodePart(params.tradeName);
  const ruc = String(params.ruc || '').replace(/\D/g, '');
  const source = `${legalName} ${tradeName}`;

  if (source.includes('AME')) return 'AME';
  if (source.includes('BOTICA_PREMIUM') || source.includes('PREMIUM')) return 'BTP';

  const words = source
    .split('_')
    .filter(
      (word) =>
        word.length >= 2 && !['SAC', 'SA', 'EIRL', 'SRL'].includes(word),
    );

  const initials = words
    .slice(0, 3)
    .map((word) => word[0])
    .join('');

  if (initials.length >= 2) return initials.padEnd(3, 'X').slice(0, 3);
  if (ruc.length >= 3) return `E${ruc.slice(-2)}`;

  return 'EMP';
}

export function buildMasterCode(productType: string, sequence: number) {
  const typePrefix = resolveProductTypePrefix(productType);
  return `HCELM-${typePrefix}-${String(sequence).padStart(6, '0')}`;
}

export function buildCompanySku(params: {
  companyPrefix: string;
  productType: string;
  sequence: number;
}) {
  const companyPrefix = normalizeCodePart(params.companyPrefix) || 'EMP';
  const typePrefix = resolveProductTypePrefix(params.productType);

  return `${companyPrefix}-${typePrefix}-${String(params.sequence).padStart(6, '0')}`;
}

export function extractSequenceFromCode(code: string | null | undefined) {
  const match = String(code || '').match(/(\d+)$/);
  if (!match) return 0;

  const value = Number(match[1]);
  return Number.isFinite(value) ? value : 0;
}
