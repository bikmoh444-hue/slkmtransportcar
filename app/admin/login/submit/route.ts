import {NextRequest,NextResponse} from 'next/server';
import {performLogin} from '@/lib/auth/login';
import {AdminAccessError,logAuthFailure,type LoginResult} from '@/lib/auth/errors';
import {loginCredentials} from '@/lib/auth/credentials';
import {reserveLoginAttempt} from '@/lib/auth/throttle';
import {configured,privileged} from '@/lib/supabase';
import {readBoundedText} from '@/lib/security/body';
export const dynamic='force-dynamic';
let warnedProviderOnly=false; // Logging only, never an in-memory rate limiter.

function redirectResult(result:LoginResult,origin:string,retryAfter?:number){
 const code=result.ok?undefined:['unconfirmed','forbidden'].includes(result.code)?'credentials':result.code==='role_check'?'auth_service':result.code;
 const response=NextResponse.redirect(new URL(result.ok?'/admin?login=complete':`/admin/login?error=${code}`,origin),303);
 if(retryAfter)response.headers.set('Retry-After',String(retryAfter));
 response.headers.set('Cache-Control','private, no-store, max-age=0, must-revalidate');
 response.headers.set('Pragma','no-cache');return response;
}
async function readForm(request:NextRequest){
 const contentType=request.headers.get('content-type')?.split(';')[0].trim();
 if(contentType!=='application/x-www-form-urlencoded'||!request.body)throw new Error('Invalid form encoding');
 const form=new FormData();for(const [name,value]of new URLSearchParams(await readBoundedText(request,16384)))form.append(name,value);
 return form;
}
export async function POST(request:NextRequest){
 const origin=request.headers.get('origin');
 let sameOrigin=false;try{sameOrigin=!!origin&&new URL(origin).origin===request.nextUrl.origin&&new URL(origin).host===request.headers.get('host')}catch{/* Fail closed. */}
 if(!sameOrigin){logAuthFailure(new AdminAccessError('origin','login_origin'));return NextResponse.json({error:'Request origin rejected'},{status:403,headers:{'Cache-Control':'private, no-store'}})}
 let form:FormData;
 try{form=await readForm(request)}catch{logAuthFailure(new AdminAccessError('credentials','form_decode'));return redirectResult({ok:false,code:'credentials'},origin!)}
 const credentials=loginCredentials.safeParse({email:form.get('email'),password:form.get('password')});
 if(!credentials.success)return redirectResult({ok:false,code:'credentials'},origin!);
 let db:ReturnType<typeof privileged>|undefined;
 try{if(process.env.SLKM_LOGIN_LIMITER==='supabase'&&configured()&&process.env.SUPABASE_SERVICE_ROLE_KEY)db=privileged()}catch{/* Admission fails safely below. */}
 const admission=await reserveLoginAttempt(request,credentials.data.email,db);
 if(!admission.ok){console.warn('[slkm-security]',{endpoint:'login',code:admission.code});return redirectResult(admission,origin!,admission.retryAfter)}
 if(admission.mode==='provider'&&!warnedProviderOnly){warnedProviderOnly=true;console.warn('[slkm-security]',{endpoint:'login',code:'provider_protection_only'})}
 const result=await performLogin(form);
 if(result.ok&&admission.pairKey&&db){try{const {error}=await db.rpc('complete_admin_login',{p_pair_key:admission.pairKey});if(error)console.warn('[slkm-security]',{endpoint:'login',code:'limiter_completion_failed'})}catch{console.warn('[slkm-security]',{endpoint:'login',code:'limiter_completion_failed'})}}
 return redirectResult(result,origin!);
}
