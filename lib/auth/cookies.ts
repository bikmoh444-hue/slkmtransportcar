import type {CookieMethodsServer,CookieOptions} from '@supabase/ssr';
import {AdminAccessError} from './errors.ts';
export function authCookieOptions(host:string,https:boolean):CookieOptions{
 let hostname='';try{hostname=new URL(`http://${host}`).hostname}catch{/* Invalid hosts never receive a cross-domain cookie. */}
 const local=['localhost','127.0.0.1','[::1]'].includes(hostname);
 return {path:'/',sameSite:'lax',httpOnly:true,secure:!local&&(https||process.env.NODE_ENV==='production')};
}
export function serverCookieAdapter(store:{getAll:()=>{name:string;value:string}[];set:(name:string,value:string,options:CookieOptions)=>unknown},writable:boolean){
 let failed=false;
 const assertWritable=()=>{if(failed)throw new AdminAccessError('cookie_write','cookie_write')};
 const methods:CookieMethodsServer={getAll:()=>store.getAll()};
 if(writable)methods.setAll=values=>{
  try{for(const {name,value,options}of values)store.set(name,value,options)}
  catch{failed=true;throw new AdminAccessError('cookie_write','cookie_write')}
 };
 // Read-only Server Components never pretend to persist cookies; Proxy refreshes them.
 return {methods,assertWritable};
}
