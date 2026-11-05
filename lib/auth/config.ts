export type SupabaseConfigResult={ok:true;url:string;key:string}|{ok:false;reason:'missing'|'url'|'private_key'|'key'|'project_mismatch'};
export function supabaseConfig(env:Record<string,string|undefined>=process.env):SupabaseConfigResult{
 const url=env.NEXT_PUBLIC_SUPABASE_URL?.trim();
 const key=(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim();
 if(!url||!key)return {ok:false,reason:'missing'};
 let endpoint:URL;
 try{endpoint=new URL(url)}catch{return {ok:false,reason:'url'}}
 const local=['localhost','127.0.0.1','[::1]'].includes(endpoint.hostname);
 if((endpoint.protocol!=='https:'&&!(local&&endpoint.protocol==='http:'))||endpoint.username||endpoint.password||endpoint.search||endpoint.hash||!['','/'].includes(endpoint.pathname))return {ok:false,reason:'url'};
 if(key.startsWith('sb_secret_'))return {ok:false,reason:'private_key'};
 if(!key.startsWith('sb_publishable_')){
  try{
   const parts=key.split('.');if(parts.length!==3)return {ok:false,reason:'key'};
   // This only checks configuration coherence. It never authenticates a session.
   const claims=JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8'));
   if(claims.role==='service_role')return {ok:false,reason:'private_key'};
   if(claims.role!=='anon')return {ok:false,reason:'key'};
   if(endpoint.hostname.endsWith('.supabase.co')&&claims.ref!==endpoint.hostname.split('.')[0])return {ok:false,reason:'project_mismatch'};
  }catch{return {ok:false,reason:'key'}}
 }
 return {ok:true,url:endpoint.origin,key};
}
