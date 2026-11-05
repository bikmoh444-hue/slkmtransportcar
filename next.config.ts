import type {NextConfig} from 'next';
import {additionalSecurityHeaders} from './lib/security/headers.ts';
function mediaOrigin(){try{return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL||'')}catch{return undefined}}
const origin=mediaOrigin();
const localStorage=!!origin&&['localhost','127.0.0.1','[::1]'].includes(origin.hostname);
const config: NextConfig = {experimental:{serverActions:{bodySizeLimit:"36mb"}},images:{dangerouslyAllowLocalIP:localStorage,remotePatterns:origin?[{protocol:origin.protocol==='http:'?'http':'https',hostname:origin.hostname,port:origin.port,pathname:'/storage/v1/object/public/slkm-media/**'}]:[]},async headers(){return [
 {source:'/(.*)',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'X-Frame-Options',value:'DENY'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},...additionalSecurityHeaders()]},
 {source:'/admin/:path*',headers:[{key:'Cache-Control',value:'private, no-store, max-age=0, must-revalidate'},{key:'Pragma',value:'no-cache'},{key:'Expires',value:'0'}]}
 ]}};
export default config;
