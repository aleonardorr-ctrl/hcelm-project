export function normalizeDocumentType(value?: string | null): string {
  return String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');
}

export function normalizeDocumentNumber(value?: string | null): string {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

export function isValidPeruvianDni(value?: string | null): boolean {
  return /^\d{8}$/.test(normalizeDocumentNumber(value));
}

function resolveDocumentPrefix(documentType?: string | null): string {
  const type = normalizeDocumentType(documentType);

  if (!type) return 'SD';
  if (['DNI', 'DOCUMENTO_NACIONAL_DE_IDENTIDAD'].includes(type)) return 'DNI';
  if (['CE', 'CARNET_EXTRANJERIA', 'CARNE_EXTRANJERIA', 'CARNET_DE_EXTRANJERIA', 'CARNE_DE_EXTRANJERIA'].includes(type)) return 'CE';
  if (['PAS', 'PASAPORTE', 'PASSPORT'].includes(type)) return 'PAS';
  if (['RUC'].includes(type)) return 'RUC';
  if (['RN', 'RECIEN_NACIDO', 'RECIEN_NACIDO_SIN_DNI'].includes(type)) return 'RN';

  return type.replace(/[^A-Z0-9]/g, '').slice(0, 10) || 'OTRO';
}

export function generateHceNumber(params: {
  documentType?: string | null;
  documentNumber?: string | null;
  patientId?: string | null;
  createdAt?: Date | string | null;
}): string | null {
  const prefix = resolveDocumentPrefix(params.documentType);
  const documentNumber = normalizeDocumentNumber(params.documentNumber);

  if (prefix === 'DNI') {
    if (!/^\d{8}$/.test(documentNumber)) return null;
    return `HCELM-DNI-${documentNumber}`;
  }

  if (prefix !== 'SD' && prefix !== 'RN' && documentNumber) {
    return `HCELM-${prefix}-${documentNumber}`;
  }

  const year = params.createdAt
    ? new Date(params.createdAt).getFullYear()
    : new Date().getFullYear();

  const patientId = String(params.patientId || '')
    .replace(/[^a-fA-F0-9]/g, '')
    .slice(0, 8)
    .toUpperCase();

  if (!patientId) return null;

  return `HCELM-${prefix || 'SD'}-${year}-${patientId}`;
}
