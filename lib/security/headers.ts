type Environment=Record<string,string|undefined>;

function supabaseOrigins(env:Environment){
  let storage='';let sockets='';
  try {
    const url=new URL(env.NEXT_PUBLIC_SUPABASE_URL||'');
    if(['https:','http:'].includes(url.protocol)){storage=url.origin;sockets=`${url.protocol==='https:'?'wss:':'ws:'}//${url.host}`}
  } catch {/* No unvalidated origin in a header. */}
  return {storage,sockets};
}

/**
 * Per-request policy. The nonce is generated in proxy.ts and Next.js also reads the
 * request CSP header to stamp its own framework scripts. Inline style attributes are
 * still used by the theme editor, so style-src keeps 'unsafe-inline'; scripts never do.
 */
export function contentSecurityPolicy(nonce:string,env:Environment=process.env){
  const {storage,sockets}=supabaseOrigins(env);
  const development=env.NODE_ENV==='development';
  let siteHttps=false;
  try{siteHttps=new URL(env.NEXT_PUBLIC_SITE_URL||'').protocol==='https:'}catch{/* No upgrade directive without a validated HTTPS origin. */}
  const directives=[
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development?" 'unsafe-eval'":''}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    `img-src 'self' data: blob: ${storage}`.trim(),
    `media-src 'self' ${storage}`.trim(),
    `connect-src 'self' ${storage} ${sockets}${development?' ws://localhost:* ws://127.0.0.1:*':''}`.trim(),
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    ...(env.NODE_ENV==='production'&&siteHttps?["upgrade-insecure-requests"]:[]),
  ];
  return directives.join('; ');
}

export function additionalSecurityHeaders(env:Environment=process.env) {
  const headers=[];
  // Explicit deployment confirmation, not automatic based on a spoofable request header.
  if(env.NODE_ENV==='production'&&env.SLKM_HSTS_ENABLED==='true') {
    try {const url=new URL(env.NEXT_PUBLIC_SITE_URL||'');if(url.protocol==='https:'&&!['localhost','127.0.0.1','[::1]'].includes(url.hostname))headers.push({key:'Strict-Transport-Security',value:'max-age=86400'})}catch{/* HSTS stays disabled. */}
  }
  return headers;
}
