import {NextRequest,NextResponse} from 'next/server';
import {z} from 'zod';
import {configured,privileged} from '@/lib/supabase';
import {readBoundedJson,RequestBodyError} from '@/lib/security/body';
import {allowedPublicOrigin,privateRateKey,trustedClientIdentity} from '@/lib/security/network';
const schema=z.object({visitor:z.uuid(),session:z.uuid(),path:z.string().max(200).regex(/^\/(fr|ar)(\/|$)/)}).strict();
export async function POST(req:NextRequest){
 const result=(status:number)=>new NextResponse(null,{status,headers:{'Cache-Control':'no-store'}});
 if(!configured()||process.env.SLKM_PREVIEW==='true'||!process.env.SUPABASE_SERVICE_ROLE_KEY||(process.env.RATE_LIMIT_SECRET?.length||0)<32)return result(503);
 if(!allowedPublicOrigin(req))return result(403);
 if(req.headers.get('content-type')?.split(';',1)[0].trim().toLowerCase()!=='application/json')return result(415);
 let parsed;
 try{parsed=schema.safeParse(await readBoundedJson(req,1500))}catch(error){return result(error instanceof RequestBodyError?error.status:400)}
 if(!parsed.success)return result(400);
 const client=trustedClientIdentity(req);
 if(!client.ok){console.warn('[slkm-security]',{endpoint:'visits',code:client.reason});return result(503)}
 const key=privateRateKey(process.env.RATE_LIMIT_SECRET!,'visits',client.ip);
 try{
 const {data,error}=await privileged().rpc('record_site_visit',{p_key:key,p_visitor:parsed.data.visitor,p_session:parsed.data.session,p_path:parsed.data.path});return result(error?503:data?204:429);
 }catch{return result(503)}
}
