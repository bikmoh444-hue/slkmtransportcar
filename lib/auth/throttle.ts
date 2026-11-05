import {privateRateKey,trustedClientIdentity} from '../security/network.ts';
type Environment=Record<string,string|undefined>;
export type LoginLimitDb={rpc:(name:string,args:Record<string,string>)=>PromiseLike<{data:unknown;error:unknown}>};
type Admission={ok:true;mode:'provider'|'supabase';pairKey?:string}|{ok:false;code:'service_unavailable'|'rate_limited';retryAfter?:number};

export async function reserveLoginAttempt(request:Request,email:string,db:LoginLimitDb|undefined,env:Environment=process.env):Promise<Admission> {
  const mode=env.SLKM_LOGIN_LIMITER||'provider';
  // Compatibility mode retains Supabase's protection. It is NOT a global app limiter.
  if(mode==='provider')return {ok:true,mode:'provider'};
  if(mode!=='supabase'||!db||(env.RATE_LIMIT_SECRET?.length||0)<32)return {ok:false,code:'service_unavailable'};
  const client=trustedClientIdentity(request,env);
  if(!client.ok)return {ok:false,code:'service_unavailable'};
  const networkKey=privateRateKey(env.RATE_LIMIT_SECRET!,'login-network',client.ip);
  const pairKey=privateRateKey(env.RATE_LIMIT_SECRET!,'login-network-account',`${client.ip}\0${email.trim().toLowerCase()}`);
  try {
    const {data,error}=await db.rpc('consume_admin_login_limit',{p_network_key:networkKey,p_pair_key:pairKey});
    if(error||!data||typeof data!=='object')return {ok:false,code:'service_unavailable'};
    const result=data as {allowed?:unknown;retry_after?:unknown};
    if(typeof result.allowed!=='boolean'||!Number.isInteger(result.retry_after)||Number(result.retry_after)<0||Number(result.retry_after)>3600)return {ok:false,code:'service_unavailable'};
    return result.allowed?{ok:true,mode:'supabase',pairKey}:{ok:false,code:'rate_limited',retryAfter:Math.max(1,Number(result.retry_after))};
  }catch{return {ok:false,code:'service_unavailable'}}
}
