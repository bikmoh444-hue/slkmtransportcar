import 'server-only';
import {isIP} from 'node:net';
import {createHmac} from 'node:crypto';
type Environment=Record<string,string|undefined>;
type ClientIdentity={ok:true;ip:string;proxy:'vercel'|'cloudflare'|'local'}|{ok:false;reason:'untrusted_proxy'|'missing_ip'|'invalid_ip'};

export function trustedClientIdentity(request:Request,env:Environment=process.env):ClientIdentity {
  const mode=env.SLKM_TRUSTED_PROXY||(env.VERCEL==='1'?'vercel':'none');
  if(mode==='local') {
    // Only for a server explicitly bound to loopback. Never a production fallback.
    const hostname=new URL(request.url).hostname;
    if(env.NODE_ENV!=='production'&&['localhost','127.0.0.1','[::1]'].includes(hostname))return {ok:true,ip:'127.0.0.1',proxy:'local'};
    return {ok:false,reason:'untrusted_proxy'};
  }
  if(mode!=='vercel'&&mode!=='cloudflare')return {ok:false,reason:'untrusted_proxy'};
  if(mode==='vercel'&&env.VERCEL!=='1')return {ok:false,reason:'untrusted_proxy'};
  // Cloudflare mode is an operator assertion that direct origin access is blocked.
  const raw=request.headers.get(mode==='vercel'?'x-vercel-forwarded-for':'cf-connecting-ip');
  if(!raw)return {ok:false,reason:'missing_ip'};
  const ip=raw.trim();
  if(!isIP(ip))return {ok:false,reason:'invalid_ip'}; // No ambiguous forwarding chains.
  // Normalize IPv6 spelling (and mapped IPv4) to prevent alternate quota keys.
  let normalized=ip;
  if(isIP(ip)===6) {
    normalized=new URL(`http://[${ip}]/`).hostname.slice(1,-1);
    const mapped=/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(normalized);
    if(mapped) {const a=parseInt(mapped[1],16),b=parseInt(mapped[2],16);normalized=`${a>>8}.${a&255}.${b>>8}.${b&255}`}
  }
  return {ok:true,ip:normalized,proxy:mode};
}

export function privateRateKey(secret:string,scope:string,value:string):string {
  return createHmac('sha256',secret).update(`${scope}\0${value}`).digest('hex');
}

export function allowedPublicOrigin(request:Request,env:Environment=process.env):boolean {
  try {const origin=new URL(env.NEXT_PUBLIC_SITE_URL||request.url).origin;return request.headers.get('origin')===origin}
  catch {return false}
}
