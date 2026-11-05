export function additionalSecurityHeaders(env:Record<string,string|undefined>=process.env) {
  let storage='';let sockets='';
  try {const url=new URL(env.NEXT_PUBLIC_SUPABASE_URL||'');if(['https:','http:'].includes(url.protocol)){storage=url.origin;sockets=`${url.protocol==='https:'?'wss:':'ws:'}//${url.host}`}}catch{/* No unvalidated origin in a header. */}
  const policy=[
    "default-src 'self'", "base-uri 'self'", "object-src 'none'", "frame-ancestors 'none'", "form-action 'self'",
    "script-src 'self'", "style-src 'self' 'unsafe-inline'", "font-src 'self' data:",
    `img-src 'self' data: blob: ${storage}`.trim(),`media-src 'self' ${storage}`.trim(),
    `connect-src 'self' ${storage} ${sockets}${env.NODE_ENV==='development'?' ws://localhost:* ws://127.0.0.1:*':''}`.trim(),
  ].join('; ');
  const headers=[{key:'Content-Security-Policy-Report-Only',value:policy}];
  // Explicit deployment confirmation, not automatic based on a spoofable request header.
  if(env.NODE_ENV==='production'&&env.SLKM_HSTS_ENABLED==='true') {
    try {const url=new URL(env.NEXT_PUBLIC_SITE_URL||'');if(url.protocol==='https:'&&!['localhost','127.0.0.1','[::1]'].includes(url.hostname))headers.push({key:'Strict-Transport-Security',value:'max-age=86400'})}catch{/* HSTS stays disabled. */}
  }
  return headers;
}
