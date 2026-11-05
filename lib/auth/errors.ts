export const loginMessages={
 origin:{fr:'La demande a été refusée. Rechargez la page depuis la même adresse du site.',ar:'تم رفض الطلب. أعيدوا تحميل الصفحة من نفس عنوان الموقع.'},
 config:{fr:'La configuration Supabase est absente ou incohérente. Contactez le responsable du site.',ar:'إعدادات Supabase غائبة أو غير متطابقة. يرجى التواصل مع مسؤول الموقع.'},
 credentials:{fr:'Email ou mot de passe incorrect. Vérifiez le compte Auth du projet ou réinitialisez son mot de passe.',ar:'البريد الإلكتروني أو كلمة المرور غير صحيحة. تحققوا من حساب Auth أو أعيدوا تعيين كلمة المرور.'},
 unconfirmed:{fr:'Votre email n’est pas confirmé. Confirmez-le avant de vous connecter.',ar:'لم يتم تأكيد البريد الإلكتروني. يرجى تأكيده قبل الدخول.'},
 forbidden:{fr:'Votre compte est authentifié, mais il n’est pas autorisé à administrer ce site. Le propriétaire doit vérifier son UUID dans admin_users.',ar:'تم التحقق من الحساب، لكنه غير مخول لإدارة الموقع. يجب على المالك التحقق من UUID في admin_users.'},
 role_check:{fr:'Impossible de vérifier les droits administrateur. Le responsable doit vérifier la table admin_users et ses politiques d’accès.',ar:'تعذر التحقق من صلاحيات الإدارة. يجب على المسؤول التحقق من جدول admin_users وسياسات الوصول.'},
 session_missing:{fr:'Connectez-vous pour accéder à l’administration.',ar:'يرجى تسجيل الدخول للوصول إلى الإدارة.'},
 session_lost:{fr:'La session n’a pas été conservée ou a expiré. Reconnectez-vous sur la même adresse du site, avec les cookies autorisés.',ar:'لم يتم حفظ الجلسة أو انتهت صلاحيتها. أعيدوا الدخول من نفس عنوان الموقع مع السماح بملفات الارتباط.'},
 cookie_write:{fr:'La session n’a pas pu être enregistrée. Réessayez ; si le problème persiste, contactez le responsable du site.',ar:'تعذر حفظ الجلسة. يرجى المحاولة مجدداً أو التواصل مع مسؤول الموقع.'},
 service_unavailable:{fr:'Le service d’authentification est momentanément inaccessible. Réessayez plus tard.',ar:'خدمة تسجيل الدخول غير متاحة مؤقتاً. يرجى المحاولة لاحقاً.'},
 rate_limited:{fr:'Trop de tentatives de connexion. Patientez avant de réessayer.',ar:'محاولات دخول كثيرة. يرجى الانتظار قبل المحاولة مجدداً.'},
 auth_service:{fr:'Le service d’authentification n’a pas pu terminer la connexion. Contactez le responsable du site.',ar:'تعذر إتمام تسجيل الدخول. يرجى التواصل مع مسؤول الموقع.'},
 logout_failed:{fr:'La déconnexion n’a pas pu être terminée. Réessayez avant de quitter cet appareil.',ar:'تعذر إتمام تسجيل الخروج. يرجى المحاولة مجدداً قبل مغادرة هذا الجهاز.'}
} as const;
export type LoginErrorCode=keyof typeof loginMessages;
export type LoginResult={ok:true}|{ok:false;code:LoginErrorCode};
export class AdminAccessError extends Error{
 readonly code:LoginErrorCode;
 readonly stage:string;
 readonly detail?:unknown;
 constructor(code:LoginErrorCode,stage:string,detail?:unknown){super(code);this.name='AdminAccessError';this.code=code;this.stage=stage;this.detail=safeErrorMetadata(detail)}
}
export function classifyAuthError(error:unknown,stage:string,missing:LoginErrorCode='session_lost'):AdminAccessError{
 if(error instanceof AdminAccessError)return error;
 const e=(error&&typeof error==='object'?error:{}) as {code?:string;status?:number;name?:string};
 let code:LoginErrorCode='auth_service';
 if(e.code==='invalid_credentials')code='credentials';
 else if(e.code==='email_not_confirmed')code='unconfirmed';
 else if(e.status===429||e.code==='over_request_rate_limit')code='rate_limited';
 else if(e.status===401&&stage==='sign_in')code='config';
 else if(e.name==='AuthSessionMissingError'||['session_not_found','refresh_token_not_found','refresh_token_already_used','bad_jwt','session_expired'].includes(e.code||''))code=missing;
 else if(e.name==='AuthRetryableFetchError'||e.name==='TypeError'||e.name==='AbortError'||e.name==='TimeoutError'||(e.status??0)>=500)code='service_unavailable';
 return new AdminAccessError(code,stage,error);
}
export function accessFailure(error:unknown,stage:string):AdminAccessError{return error instanceof AdminAccessError?error:classifyAuthError(error,stage)}
export function publicLoginMessage(code:unknown){return typeof code==='string'&&Object.hasOwn(loginMessages,code)?loginMessages[code as LoginErrorCode]:loginMessages.auth_service}
function safeErrorMetadata(detail:unknown){
 const e=(detail&&typeof detail==='object'?detail:{}) as {code?:string;status?:number;reason?:string};
 const known=new Set(['invalid_credentials','email_not_confirmed','bad_jwt','refresh_token_not_found','refresh_token_already_used','session_not_found','session_expired','over_request_rate_limit','unexpected_failure']);
 const providerCode=typeof e.code==='string'&&(known.has(e.code)||/^[0-9A-Z]{5}$|^PGRST\d{3}$/.test(e.code))?e.code:undefined;
 const configReason=typeof e.reason==='string'&&['missing','url','private_key','key','project_mismatch'].includes(e.reason)?e.reason:undefined;
 return {...(providerCode?{code:providerCode}:{}),...(Number.isInteger(e.status)?{status:e.status}:{}),...(configReason?{reason:configReason}:{})};
}
export function authDiagnostic(failure:AdminAccessError){const detail=safeErrorMetadata(failure.detail);return {stage:failure.stage,failure:failure.code,...(detail.code?{providerCode:detail.code}:{}),...(detail.status!==undefined?{status:detail.status}:{}),...(detail.reason?{configReason:detail.reason}:{})}}
export function logAuthFailure(failure:AdminAccessError){console.warn('[slkm-auth]',authDiagnostic(failure))}
