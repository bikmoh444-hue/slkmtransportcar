import {NextResponse,type NextRequest} from 'next/server';
import {complaintSchema} from '@/lib/validation';
import {privileged,configured} from '@/lib/supabase';
import {readBoundedJson,RequestBodyError} from '@/lib/security/body';
import {allowedPublicOrigin,privateRateKey,trustedClientIdentity} from '@/lib/security/network';

export async function POST(req:NextRequest) {
  const fail=(status:number)=>NextResponse.json({error:'Enregistrement indisponible / التسجيل غير متاح'},{status,headers:{'Cache-Control':'no-store'}});
  if(process.env.SLKM_PREVIEW==='true'||!configured()||!process.env.SUPABASE_SERVICE_ROLE_KEY||(process.env.RATE_LIMIT_SECRET?.length||0)<32)return fail(503);
  if(!allowedPublicOrigin(req))return fail(403);
  let parsed;
  try {parsed=complaintSchema.safeParse(await readBoundedJson(req,16000))}
  catch(error){return fail(error instanceof RequestBodyError?error.status:400)}
  if(!parsed.success)return fail(400);
  const client=trustedClientIdentity(req);
  if(!client.ok){console.warn('[slkm-security]',{endpoint:'complaints',code:client.reason});return fail(503)}
  const key=privateRateKey(process.env.RATE_LIMIT_SECRET!,'complaints',client.ip);
  try {
    const db=privileged();
    const {data:limited,error:limitError}=await db.rpc('consume_complaint_limit',{p_key:key});
    if(limitError)return fail(503);
    if(!limited)return fail(429);
    const {website:_,...values}=parsed.data;void _;
    const {error}=await db.from('complaints').insert(values);
    return error?fail(503):NextResponse.json({ok:true},{status:201,headers:{'Cache-Control':'no-store'}});
  }catch{return fail(503)}
}
