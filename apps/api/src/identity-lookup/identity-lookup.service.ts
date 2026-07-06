import { Injectable } from '@nestjs/common';

type IdentityDocumentType = 'DNI' | 'RUC' | 'CE' | 'PASSPORT' | 'OTHER';

type IdentityLookupStatus =
  | 'INVALID'
  | 'FORMAT_VALID_PROVIDER_PENDING'
  | 'VERIFIED_LOCAL';

@Injectable()
export class IdentityLookupService {
  verify(data: {
    documentType?: IdentityDocumentType;
    documentNumber?: string;
    name?: string;
  }) {
    const documentType = (data.documentType || 'DNI') as IdentityDocumentType;
    const documentNumber = String(data.documentNumber || '').trim();
    const name = String(data.name || '').trim();
    const provider = process.env.HCELM_IDENTITY_PROVIDER || 'OFFLINE';

    const invalid = (title: string, detail: string) => ({
      status: 'INVALID' as IdentityLookupStatus,
      verified: false,
      provider,
      source: 'HCELM_LOCAL_FORMAT',
      documentType,
      documentNumber,
      title,
      detail,
      person: null,
      company: null,
    });

    if (!documentNumber) {
      return invalid(
        'Documento pendiente',
        'Ingrese el numero de documento del comprador.',
      );
    }

    if (documentType === 'DNI' && !/^\d{8}$/.test(documentNumber)) {
      return invalid(
        'DNI no valido',
        'El DNI debe tener exactamente 8 digitos.',
      );
    }

    if (documentType === 'RUC' && !/^\d{11}$/.test(documentNumber)) {
      return invalid(
        'RUC no valido',
        'El RUC debe tener exactamente 11 digitos.',
      );
    }

    if (provider === 'OFFLINE') {
      return {
        status: 'FORMAT_VALID_PROVIDER_PENDING' as IdentityLookupStatus,
        verified: false,
        provider,
        source: 'HCELM_LOCAL_FORMAT',
        documentType,
        documentNumber,
        title:
          documentType === 'RUC'
            ? 'RUC con formato correcto'
            : documentType === 'DNI'
              ? 'DNI con formato correcto'
              : 'Documento registrado',
        detail:
          documentType === 'RUC'
            ? 'Formato valido. Falta configurar proveedor SUNAT o proveedor autorizado para confirmar razon social, estado y condicion.'
            : documentType === 'DNI'
              ? 'Formato valido. Falta configurar RENIEC o proveedor autorizado para confirmar nombres y apellidos.'
              : 'Documento aceptado localmente. Falta proveedor externo si se requiere verificacion oficial.',
        person:
          documentType === 'DNI'
            ? { documentNumber, fullName: name || null }
            : null,
        company:
          documentType === 'RUC'
            ? {
                ruc: documentNumber,
                legalName: name || null,
                status: null,
                condition: null,
              }
            : null,
      };
    }

    return {
      status: 'FORMAT_VALID_PROVIDER_PENDING' as IdentityLookupStatus,
      verified: false,
      provider,
      source: 'HCELM_PROVIDER_NOT_IMPLEMENTED',
      documentType,
      documentNumber,
      title: 'Proveedor configurado pero no implementado',
      detail:
        'HCELM_IDENTITY_PROVIDER esta configurado, pero el adaptador real aun no fue implementado.',
      person:
        documentType === 'DNI'
          ? { documentNumber, fullName: name || null }
          : null,
      company:
        documentType === 'RUC'
          ? {
              ruc: documentNumber,
              legalName: name || null,
              status: null,
              condition: null,
            }
          : null,
    };
  }
}
