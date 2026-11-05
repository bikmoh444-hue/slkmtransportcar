import {createServerClient,type CookieOptions} from '@supabase/ssr';
import {NextResponse,type NextRequest} from 'next/server';
import {supabaseConfig} from './lib/auth/config';
import {authCookieOptions} from './lib/auth/cookies';
import {classifyAuthError,logAuthFailure} from './lib/auth/errors';
import {contentSecurityPolicy} from './lib/security/headers';

export async function proxy(request:NextRequest){
 const nonce=crypto.randomUUID().replace(/-/g,'');
 const csp=contentSecurityPolicy(nonce);
 const requestHeaders=new Headers(request.headers);
 requestHeaders.set('x-nonce',nonce);
 requestHeaders.set('Content-Security-Policy',csp);
 requestHeaders.set('x-locale',(request.nextUrl.pathname.startsWith('/ar')||(request.nextUrl.pathname.startsWith('/admin')&&request.cookies.get('slkm-admin-locale')?.value==='ar'))?'ar':'fr');
 // These internal hints are always overwritten; they never confer authorization.
 requestHeaders.delete('x-slkm-session-error');
 requestHeaders.set('x-slkm-had-session',request.cookies.getAll().some(c=>/^sb-.+-auth-token(?:\.\d+)?$/.test(c.name))?'1':'0');
 const privateRoute=request.nextUrl.pathname.startsWith('/admin');
 const loginRoute=request.nextUrl.pathname==='/admin/login'||request.nextUrl.pathname==='/admin/login/submit';
 const outgoing=new Map<string,{value:string;options:CookieOptions}>();
 const cacheHeaders=new Map<string,string>();
 const config=supabaseConfig();
 // A stale session must not be refreshed over cookies set by a new sign-in.
 if(privateRoute&&!loginRoute&&config.ok&&requestHeaders.get('x-slkm-had-session')==='1'){
  const db=createServerClient(config.url,config.key,{
   cookieOptions:authCookieOptions(request.headers.get('host')||request.nextUrl.host,request.nextUrl.protocol==='https:'||request.headers.get('x-forwarded-proto')==='https'),
   global:{fetch:(input,init)=>fetch(input,{...init,cache:'no-store'})},
   cookies:{getAll:()=>request.cookies.getAll(),setAll:(values,responseHeaders)=>{
    for(const {name,value,options}of values){request.cookies.set(name,value);outgoing.set(name,{value,options})}
    requestHeaders.set('cookie',request.headers.get('cookie')||'');
    for(const [key,value]of Object.entries(responseHeaders))cacheHeaders.set(key,value);
   }}
  });
  try{const {error}=await db.auth.getUser();if(error&&requestHeaders.get('x-slkm-had-session')==='1'){
   const failure=classifyAuthError(error,'session_refresh');requestHeaders.set('x-slkm-session-error',failure.code);logAuthFailure(failure);
  }}catch(error){const failure=classifyAuthError(error,'session_refresh');requestHeaders.set('x-slkm-session-error',failure.code);logAuthFailure(failure)}
 }
 const response=NextResponse.next({request:{headers:requestHeaders}});
 response.headers.set('Content-Security-Policy',csp);
 for(const [name,{value,options}]of outgoing)response.cookies.set(name,value,options);
 for(const [name,value]of cacheHeaders)response.headers.set(name,value);
 if(privateRoute){response.headers.set('Cache-Control','private, no-store, max-age=0, must-revalidate');response.headers.set('Pragma','no-cache');response.headers.set('Expires','0')}
 return response;
}
export const config={matcher:[{source:'/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',missing:[{type:'header',key:'next-router-prefetch'},{type:'header',key:'purpose',value:'prefetch'}]}]};
