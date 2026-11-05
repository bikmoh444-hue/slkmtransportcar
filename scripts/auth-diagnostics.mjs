import {supabaseConfig} from '../lib/auth/config.ts';
const config=supabaseConfig();
if(!config.ok){console.log(JSON.stringify({configuration:'invalid',reason:config.reason}));process.exitCode=1;}
else{
 console.log(JSON.stringify({configuration:'locally_coherent',accountAndAdminExistence:'not_determined_by_public_key'}));
 for(const [stage,path]of [['auth_settings','/auth/v1/settings'],['public_schema_probe','/rest/v1/admin_users?select=user_id&limit=0']]){
  try{const response=await fetch(config.url+path,{headers:{apikey:config.key,Authorization:`Bearer ${config.key}`},signal:AbortSignal.timeout(8000)});
   let code;try{const body=await response.json();if(typeof body?.code==='string'&&/^[A-Z0-9]{5}$|^PGRST\d{3}$/.test(body.code))code=body.code;}catch{/* Status alone remains useful. */}
   console.log(JSON.stringify({stage,status:response.status,...(code?{code}:{})}));
  }catch{console.log(JSON.stringify({stage,status:'network_unavailable'}));process.exitCode=2;}
 }
}
