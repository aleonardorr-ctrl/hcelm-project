export const TOKEN_KEY = 'ame_token';

const PROFESSIONAL_KEYS = [
  'hcelm_professional_verified',
  'hcelm_professional_name',
  'hcelm_professional_dni',
  'hcelm_professional_type',
  'hcelm_professional_cmp',
  'hcelm_professional_rne',
  'hcelm_professional_license',
  'hcelm_professional_role',
];

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);

  PROFESSIONAL_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });

  localStorage.removeItem('selectedPatient');
  localStorage.removeItem('selectedEncounter');
  sessionStorage.removeItem('selectedPatient');
  sessionStorage.removeItem('selectedEncounter');
}

export function getAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string) {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function hasValidToken() {
  const token = getAuthToken();
  return Boolean(token);
}

export function getSessionItem(key: string) {
  localStorage.removeItem(key);
  return sessionStorage.getItem(key);
}

export function setSessionItem(key: string, value: string) {
  localStorage.removeItem(key);
  sessionStorage.setItem(key, value);
}

export function removeSessionItem(key: string) {
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
}

export function hasProfessionalVerification() {
  return getSessionItem('hcelm_professional_verified') === 'true';
}