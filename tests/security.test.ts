import {test} from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {readBoundedJson,RequestBodyError} from '../lib/security/body.ts';
import {trustedClientIdentity,privateRateKey} from '../lib/security/network.ts';
import {additionalSecurityHeaders} from '../lib/security/headers.ts';
import {settingsWriteError,publicIdentity,publicSettingsData,identityWriteError} from '../lib/security/settings.ts';
import {prepareRaster} from '../lib/security/media.ts';
import {reserveLoginAttempt} from '../lib/auth/throttle.ts';
import {seed} from '../lib/seed.ts';

function streamed(parts:Uint8Array[],headers:Record<string,string>={}) {
  let cancelled=false;
  const body=new ReadableStream<Uint8Array>({pull(controller){const next=parts.shift();if(next)controller.enqueue(next);else controller.close()},cancel(){cancelled=true}});
  return {request:new Request('https://site.invalid/api',{method:'POST',body,headers,duplex:'half'} as RequestInit),cancelled:()=>cancelled};
}
const bytes=(text:string)=>new TextEncoder().encode(text);
const rejectsStatus=(status:number)=>(error:unknown)=>error instanceof RequestBodyError&&error.status===status;
test('bounded JSON: valid, no length, false length, byte limits, cancellation and invalid JSON/UTF8',async()=>{
  assert.deepEqual(await readBoundedJson(streamed([bytes('{"ok":true}')]).request,20),{ok:true});
  assert.deepEqual(await readBoundedJson(streamed([bytes('{"ok":true}')],{'content-length':'1'}).request,20),{ok:true});
  const oversized=streamed([bytes('a'.repeat(30)),bytes('more')],{'content-length':'1'});
  await assert.rejects(readBoundedJson(oversized.request,20),rejectsStatus(413));assert.ok(oversized.cancelled());
  await assert.rejects(readBoundedJson(streamed([bytes('{}')],{'content-length':'999'}).request,20),rejectsStatus(413));
  await assert.rejects(readBoundedJson(streamed([bytes('{')]).request,20),rejectsStatus(400));
  await assert.rejects(readBoundedJson(streamed([new Uint8Array([0xff])]).request,20),rejectsStatus(400));
  const unicode=bytes('{"texte":"مرحبا é"}');
  assert.deepEqual(await readBoundedJson(streamed([...unicode].map(b=>new Uint8Array([b]))).request,unicode.length),{texte:'مرحبا é'});
  await assert.rejects(readBoundedJson(streamed([unicode]).request,unicode.length-1),rejectsStatus(413));
});
test('trusted proxies: explicit boundary, no forwarded fallback, no shared unknown IP',()=>{
  const request=(headers:Record<string,string>)=>new Request('https://site.invalid/api',{headers});
  assert.equal(trustedClientIdentity(request({'x-forwarded-for':'192.0.2.1'}),{}).ok,false);
  assert.equal(trustedClientIdentity(request({'x-vercel-forwarded-for':'192.0.2.1'}),{SLKM_TRUSTED_PROXY:'vercel'}).ok,false);
  const env={VERCEL:'1'};
  assert.deepEqual(trustedClientIdentity(request({'x-vercel-forwarded-for':'192.0.2.1','x-forwarded-for':'192.0.2.9'}),env),{ok:true,ip:'192.0.2.1',proxy:'vercel'});
  assert.equal(trustedClientIdentity(request({'x-vercel-forwarded-for':'192.0.2.1, 192.0.2.2'}),env).ok,false);
  assert.equal(trustedClientIdentity(request({}),env).ok,false);
  assert.deepEqual(trustedClientIdentity(request({'cf-connecting-ip':'::ffff:c000:201'}),{SLKM_TRUSTED_PROXY:'cloudflare'}),{ok:true,ip:'192.0.2.1',proxy:'cloudflare'});
  assert.equal(trustedClientIdentity(new Request('http://localhost/api'),{SLKM_TRUSTED_PROXY:'local',NODE_ENV:'production'}).ok,false);
  assert.equal(trustedClientIdentity(new Request('http://localhost/api'),{SLKM_TRUSTED_PROXY:'local',NODE_ENV:'development'}).ok,true);
  assert.notEqual(privateRateKey('test','visits','192.0.2.1'),privateRateKey('test','complaints','192.0.2.1'));
});
test('shared login admission: explicit activation, safe failures, private keys and cooldown',async()=>{
  const req=new Request('https://site.invalid/admin/login/submit',{headers:{'cf-connecting-ip':'192.0.2.1'}});
  assert.deepEqual(await reserveLoginAttempt(req,'test@example.invalid',undefined,{}),{ok:true,mode:'provider'});
  const env={SLKM_LOGIN_LIMITER:'supabase',SLKM_TRUSTED_PROXY:'cloudflare',RATE_LIMIT_SECRET:'test'.repeat(12)};
  assert.equal((await reserveLoginAttempt(req,'test@example.invalid',undefined,env)).ok,false);
  const calls:Record<string,string>[]=[];
  const db={rpc:async(_name:string,args:Record<string,string>)=>{calls.push(args);return {data:{allowed:true,retry_after:0},error:null}}};
  const admitted=await reserveLoginAttempt(req,'TEST@example.invalid',db,env);assert.equal(admitted.ok,true);
  assert.ok(Object.values(calls[0]).every(value=>/^[a-f0-9]{64}$/.test(value)));
  assert.equal((await reserveLoginAttempt(req,'test@example.invalid',db,{...env,SLKM_TRUSTED_PROXY:'none'})).ok,false);
  assert.deepEqual(await reserveLoginAttempt(req,'test@example.invalid',{rpc:async()=>({data:{allowed:false,retry_after:15},error:null})},env),{ok:false,code:'rate_limited',retryAfter:15});
  assert.equal((await reserveLoginAttempt(req,'test@example.invalid',{rpc:async()=>{throw new Error('offline')}},env)).ok,false);
});
test('settings: valid identity unchanged, public allowlist, no missing-row crash or automatic republish',()=>{
  assert.equal(settingsWriteError(seed.site_settings[0].data),undefined);
  assert.equal(publicIdentity(seed)?.key,'identity');
  assert.equal(publicIdentity({...seed,site_settings:[]}),undefined);
  assert.equal(publicIdentity({...seed,site_settings:[{...seed.site_settings[0],is_active:false}]}),undefined);
  assert.ok(identityWriteError('identity',false));assert.ok(identityWriteError('renamed',true,{key:'identity'}));
  assert.equal(identityWriteError('identity',true),undefined);
  assert.ok(settingsWriteError({password:'not-a-real-secret'}));assert.ok(settingsWriteError({extra:{api_key:'test'}}));
  assert.ok(settingsWriteError({unknown:'new'}));assert.equal(settingsWriteError({unknown:'legacy'},{unknown:'legacy'}),undefined);
  assert.deepEqual(publicSettingsData({phone:'public',unknown:'internal'}),{phone:'public'});
});
test('headers: report only, no premature CSP enforcement or HSTS',()=>{
  const headers=additionalSecurityHeaders({NODE_ENV:'production',NEXT_PUBLIC_SUPABASE_URL:'https://storage.invalid'});
  assert.ok(headers.find(h=>h.key==='Content-Security-Policy-Report-Only')?.value.includes('https://storage.invalid'));
  assert.ok(!headers.some(h=>['Content-Security-Policy','Strict-Transport-Security'].includes(h.key)));
  const configured=additionalSecurityHeaders({NODE_ENV:'production',NEXT_PUBLIC_SITE_URL:'https://site.invalid',SLKM_HSTS_ENABLED:'true'});
  assert.equal(configured.find(h=>h.key==='Strict-Transport-Security')?.value,'max-age=86400');
  assert.ok(!additionalSecurityHeaders({NODE_ENV:'production',NEXT_PUBLIC_SITE_URL:'http://site.invalid',SLKM_HSTS_ENABLED:'true'}).some(h=>h.key==='Strict-Transport-Security'));
});
test('raster uploads: decode true format, keep transparency, support AVIF, reject disguised SVG and oversized files',async()=>{
  const source=sharp({create:{width:16,height:12,channels:4,background:{r:20,g:50,b:100,alpha:0.4}}});
  for(const format of ['png','webp','jpeg','avif'] as const){
    const buffer=await source.clone().toFormat(format).toBuffer();
    const output=await prepareRaster(new File([new Uint8Array(buffer)],`image.${format}`,{type:`image/${format}`}),format==='png'?'favicon':'image');
    assert.equal(output.info.format,format==='png'?'png':'webp');
    if(format==='png'){assert.equal(output.info.width,128);assert.equal(output.info.hasAlpha,true)}
    if(format==='webp')assert.equal(output.info.hasAlpha,true);
  }
  await assert.rejects(prepareRaster(new File(['<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>'],'fake.png',{type:'image/png'}),'image'));
  await assert.rejects(prepareRaster(new File([new Uint8Array(8*1024*1024+1)],'large.png',{type:'image/png'}),'image'));
  await assert.rejects(prepareRaster(new File([],'empty.png',{type:'image/png'}),'image'));
});
