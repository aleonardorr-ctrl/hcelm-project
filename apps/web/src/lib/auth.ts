export const TOKEN_KEY = "ame_token";
export const PLATFORM_TOKEN_KEY = "hcelm_platform_token";
const SESSION_NOTICE_KEY = "hcelm_session_notice";

const AUTH_CONTEXT_KEYS = [
  "hcelm_professional_verified",
  "hcelm_professional_user_id",
  "hcelm_professional_name",
  "hcelm_professional_dni",
  "hcelm_professional_type",
  "hcelm_professional_cmp",
  "hcelm_professional_rne",
  "hcelm_professional_license",
  "hcelm_professional_role",
  "hcelm_require_professional_verification",
  "hcelm_tenant_name",
  "hcelm_company_id",
  "hcelm_company_code",
  "hcelm_company_name",
  "hcelm_company_legal_name",
  "hcelm_company_ruc",
  "hcelm_business_unit_id",
  "hcelm_business_unit_code",
  "hcelm_business_unit_name",
  "hcelm_warehouse_id",
  "hcelm_warehouse_code",
  "hcelm_warehouse_name",
  "hcelm_user_name",
  "hcelm_user_role",
  "hcelm_platform_role",
  "hcelm_access_mode",
  "hcelm_context_source",
  "hcelm_platform_access_audit_id",
  "hcelm_platform_access_reason",
  "hcelm_platform_access_entered_at",
];

const SELECTED_RECORD_KEYS = [
  "selectedPatient",
  "selectedPatientId",
  "selectedEncounter",
  "selectedEncounterId",
  "selectedHceNumber",
  "hcelm_selected_patient",
  "hcelm_selected_patient_id",
];

let authFailureInterceptorInstalled = false;
let authenticationRedirectInProgress = false;

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PLATFORM_TOKEN_KEY);
  sessionStorage.removeItem(PLATFORM_TOKEN_KEY);

  AUTH_CONTEXT_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });

  SELECTED_RECORD_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
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
  const requireVerification =
    sessionStorage.getItem("hcelm_require_professional_verification") ===
    "true";

  if (requireVerification) return false;

  return getSessionItem("hcelm_professional_verified") === "true";
}
export function preservePlatformToken() {
  const token = getAuthToken();

  if (!token) {
    return false;
  }

  localStorage.removeItem(PLATFORM_TOKEN_KEY);
  sessionStorage.setItem(PLATFORM_TOKEN_KEY, token);

  return true;
}

export function restorePlatformToken() {
  const platformToken = sessionStorage.getItem(PLATFORM_TOKEN_KEY);

  if (!platformToken) {
    return false;
  }

  clearAuthSession();
  setAuthToken(platformToken);

  return true;
}

export function hasPreservedPlatformToken() {
  localStorage.removeItem(PLATFORM_TOKEN_KEY);
  return Boolean(sessionStorage.getItem(PLATFORM_TOKEN_KEY));
}

export function consumeSessionNotice() {
  const notice = sessionStorage.getItem(SESSION_NOTICE_KEY);
  sessionStorage.removeItem(SESSION_NOTICE_KEY);
  localStorage.removeItem(SESSION_NOTICE_KEY);
  return notice;
}

function hasBearerAuthorization(input: RequestInfo | URL, init?: RequestInit) {
  const headers = new Headers(input instanceof Request ? input.headers : {});

  if (init?.headers) {
    new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  }

  return /^Bearer\s+\S+/i.test(headers.get("Authorization") || "");
}

export function installAuthFailureInterceptor() {
  if (authFailureInterceptorInstalled) {
    return;
  }

  authFailureInterceptorInstalled = true;
  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const authenticatedRequest = hasBearerAuthorization(input, init);
    const response = await nativeFetch(input, init);

    if (
      response.status !== 401 ||
      !authenticatedRequest ||
      authenticationRedirectInProgress
    ) {
      return response;
    }

    authenticationRedirectInProgress = true;

    if (restorePlatformToken()) {
      window.location.replace("/platform");
      return response;
    }

    clearAuthSession();
    sessionStorage.setItem(
      SESSION_NOTICE_KEY,
      "La sesión fue cerrada porque el acceso expiró, fue suspendido o dejó de estar habilitado.",
    );
    window.location.replace("/login");

    return response;
  };
}
