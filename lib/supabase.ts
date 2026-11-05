import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import {headers} from 'next/headers';
import {supabaseConfig} from './auth/config';
import {AdminAccessError,accessFailure,logAuthFailure} from './auth/errors';
import {authorizeAdmin} from './auth/access';
import {authCookieOptions,serverCookieAdapter} from './auth/cookies';
export const configured=()=>supabaseConfig().ok;
export async function sessionContext({writable=false}:{writable?:boolean}={}){
 const config=supabaseConfig();if(!config.ok)throw new AdminAccessError('config','configuration',{reason:config.reason});
 const jar=await cookies(),requestHeaders=await headers();
 const adapter=serverCookieAdapter({getAll:()=>jar.getAll(),set:(name,value,options)=>jar.set(name,value,options)},writable);
 const db=createServerClient(config.url,config.key,{
  cookieOptions:authCookieOptions(requestHeaders.get('host')||'',requestHeaders.get('x-forwarded-proto')==='https'),
  cookies:adapter.methods,
  global:{fetch:(input,init)=>fetch(input,{...init,cache:'no-store'})}
 });
 return {db,assertCookiesWritten:adapter.assertWritable};
}
export async function sessionClient(options:{writable?:boolean}={}){return (await sessionContext(options)).db}
export function privileged(){const config=supabaseConfig();if(!config.ok)throw new AdminAccessError('config','configuration',{reason:config.reason});return createClient(config.url,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}})}
export async function requireAdmin(options:{writable?:boolean}={}){
 try{const context=await sessionContext(options);await authorizeAdmin(context.db);context.assertCookiesWritten();return context.db}
 catch(error){const failure=accessFailure(error,'admin_guard');if(failure.code!=='session_missing')logAuthFailure(failure);throw failure}
}
