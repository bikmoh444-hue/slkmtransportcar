// Isolated local GoTrue/PostgREST fixture + real Next.js and @supabase/ssr.
// No production account, real password, remote database, or application auth bypass.
import {createServer,request as httpRequest} from 'node:http';
import {spawn} from 'node:child_process';
import {randomUUID,randomBytes} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {once} from 'node:events';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {createServerClient} from '@supabase/ssr';
import {seed} from '../lib/seed.ts';

const password=' '+randomBytes(24).toString('base64url')+'+ ';
const fixtureKey='sb_publishable_'+randomBytes(24).toString('hex');
const serviceKey='sb_secret_'+randomBytes(24).toString('hex'),rateSecret=randomBytes(32).toString('hex');
let publicWrites=0,denyPublic=false,loginAdmission='allow';
const users=Object.fromEntries(['admin','staff','unconfirmed','role_error'].map(kind=>[kind,{id:randomUUID(),aud:'authenticated',role:'authenticated',email:`${kind}@auth-test.invalid`,email_confirmed_at:kind==='unconfirmed'?null:new Date().toISOString(),app_metadata:{provider:'email',providers:['email']},user_metadata:{test_fixture:'x'.repeat(3500)},created_at:new Date().toISOString(),updated_at:new Date().toISOString()}]));
const storedMedia=new Map();let rejectUpload=false, rejectSave=false;
const sessions=new Map(),refreshes=new Map();let refreshCount=0,writeCount=0;const roleChecks=[],authProbes=[];
const content=Object.fromEntries(Object.entries(seed).map(([table,rows])=>[table,rows.map(row=>({...structuredClone(row),id:randomUUID()}))]));
content.hero_slides[0].data.image='/media/desktop-fixture.png';content.hero_slides[0].data.mobile_image='/media/mobile-fixture.png';
for(const key of ['services','reseau','messagerie','transports','contact']){const row=content.page_sections.find(row=>row.key===key);row.data.second_fr='Section extra '+key;row.data.image='/media/extra-'+key+'.png';}
for(const row of content.network_maps)row.data.image='/media/map-fixture.png';
content.network_maps=content.network_maps.filter(row=>row.key!=='voyageurs');
function issue(user){const now=Math.floor(Date.now()/1000),jwt=[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:user.id,aud:'authenticated',role:'authenticated',iat:now,exp:now+3600})).toString('base64url'),randomBytes(24).toString('base64url')].join('.');const refresh=randomBytes(24).toString('hex');sessions.set(jwt,user);refreshes.set(refresh,{user,access:jwt});return {access_token:jwt,refresh_token:refresh,token_type:'bearer',expires_in:3600,expires_at:now+3600,user}}
const api=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://fixture.invalid');const user=sessions.get((req.headers.authorization||'').replace(/^Bearer /,''));const chunks=[];for await(const part of req)chunks.push(part);const rawBytes=Buffer.concat(chunks);let raw=rawBytes.toString();let body={};try{body=raw?JSON.parse(raw):{}}catch{}
 const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Supabase-Api-Version':'2024-01-01'});res.end(value===undefined?'':JSON.stringify(value))};
 if(url.pathname==='/auth/v1/token'){
  if(url.searchParams.get('grant_type')==='refresh_token'){
   const previous=refreshes.get(body.refresh_token);if(!previous)return send(400,{code:'refresh_token_not_found',message:'Fixture expired refresh'});
   // Match the short refresh-token reuse interval used for concurrent SSR requests.
   if(previous.replacement){if(Date.now()-previous.rotatedAt<10000)return send(200,previous.replacement);return send(400,{code:'refresh_token_not_found',message:'Fixture expired refresh'})}
   previous.replacement=issue(previous.user);previous.rotatedAt=Date.now();refreshCount++;return send(200,previous.replacement);
  }
  const match=Object.values(users).find(u=>u.email===body.email);
  authProbes.push({kind:Object.keys(users).find(key=>users[key]===match)||'unknown',credentialMatched:body.password===password});
  if(!match||body.password!==password)return send(400,{code:'invalid_credentials',message:'Invalid login credentials'});
  if(match===users.unconfirmed)return send(400,{code:'email_not_confirmed',message:'Email not confirmed'});
  return send(200,issue(match));
 }
 if(url.pathname==='/auth/v1/user')return user?send(200,user):send(401,{code:'bad_jwt',message:'Fixture session invalid'});
 if(url.pathname==='/auth/v1/logout'){sessions.delete((req.headers.authorization||'').replace(/^Bearer /,''));return send(204)}
 if(url.pathname.startsWith('/storage/v1/object/')){
  if(user!==users.admin)return send(403,{message:'Policy denied',statusCode:'403',error:'Unauthorized'});
  if(rejectUpload)return send(403,{message:'Policy denied',statusCode:'403',error:'Unauthorized'});
  const name=url.pathname.split('/slkm-media/')[1];
  if(req.method==='POST'){storedMedia.set(name,rawBytes);return send(200,{Key:'slkm-media/'+name})}
  if(req.method==='DELETE'){for(const name of body.prefixes||[])storedMedia.delete(name);return send(200,[])}
 }
 if(req.headers.authorization===`Bearer ${serviceKey}`){
  if(url.pathname==='/rest/v1/rpc/consume_admin_login_limit')return loginAdmission==='error'?send(503,{message:'Fixture unavailable'}):send(200,{allowed:loginAdmission==='allow',retry_after:loginAdmission==='allow'?0:15});
  if(url.pathname==='/rest/v1/rpc/complete_admin_login')return send(200,null);
  if(url.pathname==='/rest/v1/rpc/consume_complaint_limit')return send(200,!denyPublic);
  if(url.pathname==='/rest/v1/rpc/record_site_visit'){if(!denyPublic)publicWrites++;return send(200,!denyPublic)}
  if(url.pathname==='/rest/v1/complaints'&&req.method==='POST'){publicWrites++;return send(201,null)}
 }
 if(url.pathname.startsWith('/rest/v1/')){
  const table=url.pathname.split('/').at(-1);
  if(!user){if(req.method==='GET'&&content[table]&&req.headers.apikey===fixtureKey)return send(200,content[table].filter(row=>row.is_active));return send(401,{code:'PGRST301',message:'Fixture authentication required'})}
  if(table==='admin_users'){
   roleChecks.push(user.id);if(user===users.role_error)return send(403,{code:'42501',message:'permission denied for table admin_users'});
   assert.equal(url.searchParams.get('user_id'),`eq.${user.id}`);
   return send(200,user===users.admin?{user_id:user.id}:null);
  }
  if(table==='admin_traffic_daily')return send(200,[]);
  if(table==='admin_traffic_summary')return send(200,{total:0,today:0,week:0,month:0,previous_day:0});
  if(req.method==='POST'||req.method==='PATCH'||req.method==='DELETE'){
   if(user!==users.admin)return send(403,{code:'42501',message:'Fixture policy denied'});
   if(rejectSave&&table==='site_settings')return send(500,{code:'XX000',message:'Fixture save failed'});
   writeCount++;const row=Array.isArray(body)?body[0]:body;
   if(table==='media_assets'){content.media_assets??=[];if(req.method==='POST'){row.id=randomUUID();content.media_assets.push(row);return send(200,row)}if(req.method==='DELETE'){content.media_assets=content.media_assets.filter(r=>r.id!==url.searchParams.get('id')?.replace(/^eq\./,''));return send(200,[])}}
   if(content[table]){const index=content[table].findIndex(r=>r.id===(row.id||url.searchParams.get('id')?.replace(/^eq\./,'')));if(index>=0){content[table][index]={...content[table][index],...row}}else if(req.method==='POST'){row.id??=randomUUID();content[table].push(row)}}
   return send(200,[row]);
  }
  let rows=content[table]||[];for(const [field,filter] of url.searchParams){if(field==='id'&&filter.startsWith('eq.'))rows=rows.filter(row=>row.id===filter.slice(3));if(field==='key'){if(filter.startsWith('eq.'))rows=rows.filter(row=>row.key===filter.slice(3));if(filter.startsWith('in.'))rows=rows.filter(row=>filter.slice(4,-1).split(',').includes(row.key));if(filter.startsWith('not.in.'))rows=rows.filter(row=>!filter.slice(8,-1).split(',').includes(row.key))}if(field==='is_active')rows=rows.filter(row=>row.is_active===(filter==='eq.true'));if(field==='data->>type')rows=rows.filter(row=>row.data.type===filter.slice(3))}res.setHeader('Content-Range',`0-${Math.max(0,rows.length-1)}/${rows.length}`);
  if(req.method==='HEAD')return send(200);
  if(req.headers.accept?.includes('application/vnd.pgrst.object+json'))return send(200,rows[0]||null);
  return send(200,rows.slice(Number(url.searchParams.get('offset')||0),url.searchParams.has('limit')?Number(url.searchParams.get('offset')||0)+Number(url.searchParams.get('limit')):undefined));
 }
 return send(404,{code:'fixture_endpoint_unknown'});
});
api.listen(0,'127.0.0.1');await once(api,'listening');const apiUrl=`http://127.0.0.1:${api.address().port}`;
async function appPort(){
 const probes=[];let free3000=true;
 for(const host of ['127.0.0.1','::1']){const probe=createServer();try{probe.listen({port:3000,host,ipv6Only:true});await once(probe,'listening');probes.push(probe)}catch{free3000=false}}
 for(const probe of probes)await new Promise(resolve=>probe.close(resolve));
 if(free3000)return 3000;
 const free=createServer();free.listen(0,'localhost');await once(free,'listening');const port=free.address().port;await new Promise(resolve=>free.close(resolve));return port;
}
const port=await appPort(),base=`http://localhost:${port}`;
const child=spawn(process.execPath,['--require','./tests/loopback-only.cjs','node_modules/next/dist/bin/next','start','--hostname','localhost','--port',String(port)],{cwd:process.cwd(),env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:apiUrl,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:fixtureKey,NEXT_PUBLIC_SUPABASE_ANON_KEY:'',SUPABASE_SERVICE_ROLE_KEY:serviceKey,RATE_LIMIT_SECRET:rateSecret,SLKM_LOGIN_LIMITER:'supabase',SLKM_TRUSTED_PROXY:'cloudflare',NEXT_PUBLIC_SITE_URL:base,SLKM_PREVIEW:'false'},stdio:['ignore','pipe','pipe'],windowsHide:true});
let output='';child.stdout.on('data',chunk=>{output=(output+chunk).slice(-30000)});child.stderr.on('data',chunk=>{output=(output+chunk).slice(-30000)});
let browser;const results=[];
try{
 let ready=false;for(let attempt=0;attempt<60;attempt++){if(child.exitCode!==null)break;if(output.includes('Ready'))try{const response=await fetch(base+'/admin/login',{signal:AbortSignal.timeout(1000)});if(response.ok){ready=true;break}}catch{}await new Promise(resolve=>setTimeout(resolve,250))}
 assert.ok(ready,'isolated Next.js auth test server must start');
 browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'chrome'});
 const trustedHeaders={'cf-connecting-ip':'192.0.2.12'};
 const context=await browser.newContext({extraHTTPHeaders:trustedHeaders}),page=await context.newPage();
 const hydrationErrors=[];page.on('pageerror',error=>hydrationErrors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&/hydrat|didn't match|cannot be a descendant|Minified React error #(418|419|421|422|423|425)/i.test(message.text()))hydrationErrors.push(message.text())});
 await page.route('**/_next/image?*',route=>route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=','base64')}));
 async function submit(kind,pass=password){
  await page.goto(base+'/admin/login');await page.locator('#email').fill(users[kind].email);await page.locator('#password').fill(pass);
  const posted=page.waitForResponse(response=>response.request().method()==='POST'&&new URL(response.url()).pathname==='/admin/login/submit');
  await page.getByRole('button',{name:'Se connecter / الدخول',exact:true}).click();
  const response=await posted;assert.equal(response.status(),303);assert.equal(response.request().headers()['next-action'],undefined,'login must not use Server Action/RSC transport');
 }
 // Public endpoints use local service-role fixture only, never a remote database.
 const complaint={full_name:'Local test',email:'local@example.invalid',message:'Message de test suffisamment long',locale:'fr',website:''};
 const visit={visitor:randomUUID(),session:randomUUID(),path:'/fr'};
 for(const [endpoint,payload,success,limit]of [['complaints',complaint,201,16000],['visits',visit,204,1500]]){
  const send=(data,headers={})=>context.request.post(base+'/api/'+endpoint,{headers:{Origin:base,'Content-Type':'application/json',...headers},data});
  assert.equal((await send(JSON.stringify(payload))).status(),success);
  assert.equal((await send('{')).status(),400);
  assert.equal((await send(' '.repeat(limit+1))).status(),413);
  assert.equal((await send(JSON.stringify(payload),{'cf-connecting-ip':'','x-forwarded-for':'192.0.2.8'})).status(),503);
  denyPublic=true;assert.equal((await send(JSON.stringify(payload))).status(),429);denyPublic=false;
 }
 assert.ok(publicWrites>=2);results.push('public_api_success_malformed_oversize_untrusted_and_quota');
 async function chunked(endpoint,chunks){
  return new Promise((resolve,reject)=>{
   const req=httpRequest(base+'/api/'+endpoint,{method:'POST',headers:{Origin:base,'Content-Type':'application/json',...trustedHeaders}},response=>{response.resume();response.on('end',()=>resolve(response.statusCode))});
   req.on('error',reject);for(const chunk of chunks)req.write(chunk);req.end();
  });
 }
 assert.equal(await chunked('complaints',[Buffer.from(JSON.stringify({...complaint,message:'Message UTF-8 '+String.fromCodePoint(0x645,0x631,0x62d,0x628,0x627)}))]),201);
 assert.equal(await chunked('visits',[Buffer.alloc(1000,32),Buffer.alloc(501,32)]),413);
 assert.equal(await chunked('visits',[Buffer.from([0xff])]),400);
 results.push('api_chunked_without_content_length_utf8_and_early_limit');
 const loginPost=headers=>context.request.post(base+'/admin/login/submit',{headers:{Origin:base,...headers},form:{email:users.admin.email,password},maxRedirects:0});
 let denied=await loginPost({'cf-connecting-ip':''});assert.ok(denied.headers().location.includes('error=service_unavailable'));assert.equal(authProbes.length,0);
 loginAdmission='deny';denied=await loginPost({});assert.ok(denied.headers().location.includes('error=rate_limited'));assert.equal(denied.headers()['retry-after'],'15');assert.equal(authProbes.length,0);
 loginAdmission='error';denied=await loginPost({});assert.ok(denied.headers().location.includes('error=service_unavailable'));assert.equal(authProbes.length,0);loginAdmission='allow';
 const securityHeaders=(await context.request.get(base+'/admin/login')).headers();assert.ok(securityHeaders['content-security-policy-report-only']);assert.equal(securityHeaders['content-security-policy'],undefined);assert.equal(securityHeaders['x-frame-options'],'DENY');
 results.push('login_admission_before_auth_and_report_only_headers');

 const rejected=await context.request.post(base+'/admin/login/submit',{headers:{Origin:'https://other.example.invalid','Content-Type':'application/x-www-form-urlencoded'},data:'email=&password='});assert.equal(rejected.status(),403);assert.equal(authProbes.length,0);results.push('login_post_origin_check');
 for(const [kind,pass,code]of [['admin','incorrect-fixture-password','credentials'],['unconfirmed',password,'credentials'],['staff',password,'credentials'],['role_error',password,'auth_service']]){
  console.log('Fixture step: '+code);
  await submit(kind,pass);await page.waitForURL(url=>url.pathname==='/admin/login'&&url.searchParams.get('error')===code);await page.locator('.login p[role=alert]').waitFor({state:'visible'});results.push(code);
 }
 await submit('admin');await page.waitForURL(url=>url.pathname==='/admin'&&!url.search);
 let cookieParts=(await context.cookies()).filter(c=>/^sb-.+-auth-token(?:\.\d+)?$/.test(c.name));assert.ok(cookieParts.length>=2,'fixture exercises chunked session cookies');assert.ok(cookieParts.every(c=>c.httpOnly&&!c.secure&&c.sameSite==='Lax'&&c.path==='/'));
 assert.deepEqual(await page.locator('.admin-nav a').allTextContents(),['Statistiques','Accueil','Notre histoire','Lignes et r\u00e9seau','Messagerie','Location de transport','Contact','Param\u00e8tres']);
 const reload=await page.reload();assert.equal(new URL(page.url()).pathname,'/admin');assert.match(reload.headers()['cache-control'],/private/);assert.match(reload.headers()['cache-control'],/no-store/);results.push('login_redirect_cookie_chunks_and_reload');
 for(const width of [390,768,1440]){await page.setViewportSize({width,height:960});await page.goto(base+'/admin');await page.locator('.v2-stats').waitFor();assert.equal(await page.locator('.stat-card').count(),10);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);if(width===390){await page.getByRole('button',{name:'Ouvrir le menu',exact:true}).click();await page.locator('.drawer-open').waitFor();await page.getByRole('button',{name:'Fermer le menu',exact:true}).first().click()}await mkdir('artifacts',{recursive:true});await page.screenshot({path:`artifacts/admin-v2-${width}.png`,fullPage:true})}
 await page.setViewportSize({width:1440,height:960});
 for(const path of ['/admin/accueil','/admin/notre-histoire','/admin/lignes-reseau','/admin/messagerie','/admin/location-transport','/admin/contact','/admin/parametres']){await page.goto(base+path);await page.locator('.admin-shell').waitFor();assert.equal(await page.locator('.admin-nav a[aria-current=page]').getAttribute('href'),path);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false)}
 results.push('dashboard_10_cards_responsive_dedicated_pages');
 await page.goto(base+'/admin/accueil');
 const firstEditor=page.locator('.editor-toggle').first();await firstEditor.click();assert.equal(await firstEditor.getAttribute('aria-expanded'),'true');await firstEditor.click();assert.equal(await firstEditor.getAttribute('aria-expanded'),'false');
 await Promise.all([page.waitForNavigation({waitUntil:'networkidle'}),page.locator('.admin-language-select').selectOption('ar')]);
 assert.equal(await page.locator('.admin-shell').getAttribute('dir'),'rtl');assert.equal(await page.locator('html').getAttribute('lang'),'ar');
 assert.equal(await page.locator('h1').textContent(),'الرئيسية');
 for(const width of [390,1440]){await page.setViewportSize({width,height:960});await page.goto(base+'/admin');assert.equal(await page.locator('h1').textContent(),'الإحصائيات');assert.ok((await page.locator('.stat-card').first().textContent()).includes('مجموع زيارات الموقع'));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:'artifacts/admin-ar-'+width+'.png',fullPage:true})}
 await page.goto(base+'/admin/parametres');await page.locator('#brand-logo').waitFor();assert.ok((await page.locator('#logo-icone h2').textContent()).includes('شعار الموقع'));
 await Promise.all([page.waitForNavigation({waitUntil:'networkidle'}),page.locator('.admin-language-select').selectOption('fr')]);
 assert.equal(await page.locator('.admin-shell').getAttribute('dir'),'ltr');
 await page.locator('#url-logo').fill('/media/test-logo.png');await page.locator('#url-favicon').fill('/media/test-icon.png');
 await page.getByRole('button',{name:'Enregistrer les logos et l’icône',exact:true}).click();await page.getByRole('status').filter({hasText:'Modifications enregistrées.'}).waitFor();
 assert.equal(content.site_settings[0].data.logo,'/media/test-logo.png');assert.equal(content.site_settings[0].data.favicon,'/media/test-icon.png');
 await page.reload();assert.equal(await page.locator('#url-logo').inputValue(),'/media/test-logo.png');

 // Exercise real Sharp conversion, Storage transport, reference save and rollback.
 const png=await (await import('sharp')).default({create:{width:16,height:16,channels:4,background:{r:20,g:100,b:180,alpha:.5}}}).png().toBuffer();
 const choose=()=>page.locator('#brand-logo input[type=file]').setInputFiles({name:'logo-test.png',mimeType:'image/png',buffer:png});
 const saveBrand=()=>page.getByRole('button',{name:'Enregistrer les logos et l\u2019ic\u00f4ne',exact:true}).click();
 await choose();await page.waitForFunction(()=>document.querySelector('#brand-logo img')?.src.startsWith('blob:'));
 assert.equal(storedMedia.size,0,'selection stays local');
 await page.locator('#brand-logo').getByRole('button',{name:'Annuler',exact:true}).click();assert.equal(storedMedia.size,0);
 const publicBefore=await (await fetch(base+'/fr')).text();for(const key of ['services','reseau','messagerie','transports','contact']){assert.ok(publicBefore.includes('Section extra '+key),'editable section text must render');assert.ok(publicBefore.includes(encodeURIComponent('/media/extra-'+key+'.png')),'editable section image must render');}assert.ok(publicBefore.includes(encodeURIComponent('/media/test-logo.png')));
 await choose();rejectUpload=true;await saveBrand();await page.getByRole('status').filter({hasText:'Upload refus\u00e9'}).waitFor();
 assert.equal(content.site_settings[0].data.logo,'/media/test-logo.png');assert.ok(await page.locator('#brand-logo').textContent().then(x=>x.includes('logo-test.png')));
 rejectUpload=false;rejectSave=true;await saveBrand();await page.getByRole('status').filter({hasText:'Sauvegarde impossible'}).waitFor();
 assert.equal(storedMedia.size,0,'failed save removes newly uploaded object');assert.equal(content.media_assets.length,0);
 rejectSave=false;await page.locator('#brand-favicon input[type=file]').setInputFiles({name:'icon.png',mimeType:'image/png',buffer:png});await saveBrand();await page.getByRole('status').filter({hasText:'Modifications enregistr\u00e9es.'}).waitFor();
 const uploadedLogo=content.site_settings[0].data.logo;assert.ok(uploadedLogo.includes('/storage/v1/object/public/slkm-media/uploads/'));assert.equal(storedMedia.size,2);assert.equal((await (await import('sharp')).default(storedMedia.get(uploadedLogo.split('/slkm-media/')[1])).metadata()).hasAlpha,true,'logo transparency is preserved');assert.ok(content.media_assets.some(row=>row.mime==='image/png'&&row.width===128&&row.height===128));
 const publicAfter=await (await fetch(base+'/fr')).text();assert.ok(publicAfter.includes(encodeURIComponent(uploadedLogo)),'public content cache is invalidated after saving');assert.ok(publicAfter.includes(content.site_settings[0].data.favicon),'public metadata uses saved favicon');
 await page.reload();assert.equal(await page.locator('#url-logo').inputValue(),uploadedLogo);assert.equal(await page.locator('#url-favicon').inputValue(),content.site_settings[0].data.favicon);


 const publicPage=await context.newPage();await publicPage.emulateMedia({reducedMotion:'reduce'});
 await publicPage.route('**/_next/image?*',route=>route.fulfill({contentType:'image/png',body:png}));
 await publicPage.setViewportSize({width:1440,height:900});await publicPage.goto(base+'/fr',{waitUntil:'networkidle'});
 const heroSource=await publicPage.locator('.hero img').evaluate(img=>new URL(img.currentSrc).searchParams.get('url'));
 assert.equal(heroSource,'/media/desktop-fixture.png');await publicPage.setViewportSize({width:390,height:844});
 assert.equal(await publicPage.locator('.hero img').evaluate(img=>new URL(img.currentSrc).searchParams.get('url')),heroSource,'phone uses the same photo as desktop');

 for(const width of [390,1440]){await publicPage.setViewportSize({width,height:900});assert.ok(await publicPage.locator('.network-map-image').count());for(const img of await publicPage.locator('.network-map-image').all()){const dims=await img.evaluate(img=>({width:img.getBoundingClientRect().width,frame:img.closest('.map-preview').getBoundingClientRect().width,padding:getComputedStyle(img).padding}));assert.ok(Math.abs(dims.width-dims.frame)<2,'network image fills its frame');assert.equal(dims.padding,'0px')}}
 await publicPage.locator('.map-preview:not(:disabled)').first().click();await publicPage.locator('dialog[open]').waitFor();await publicPage.locator('dialog[open]').getByRole('button',{name:'Fermer',exact:true}).click();
 results.push('network_images_fill_frames_and_open_full_map');
 await page.bringToFront();
 await page.goto(base+'/admin/notre-histoire');await page.locator('.editor-toggle').first().click();
 await page.locator('.editor-card input[type=file]').first().setInputFiles({name:'history.png',mimeType:'image/png',buffer:png});
 await page.waitForFunction(()=>Array.from(document.querySelectorAll('.editor-card img')).some(img=>img.src.startsWith('blob:')));
 await page.getByRole('button',{name:'Enregistrer',exact:true}).click();await page.getByRole('status').filter({hasText:/^Enregistr\u00e9$/}).waitFor();
 const historyImage=content.page_sections.find(row=>row.key==='histoire').data.image;
 assert.ok(historyImage.includes('/uploads/'),JSON.stringify({historyImage,rows:content.page_sections.map(row=>({key:row.key,image:row.data.image})),forms:await page.locator('input[name=key]').evaluateAll(inputs=>inputs.map(input=>input.value)),status:await page.getByRole('status').allTextContents()}));assert.ok((await (await fetch(base+'/fr')).text()).includes(encodeURIComponent(historyImage)));

 await publicPage.bringToFront();await publicPage.locator('.story img').waitFor();
 assert.equal(await publicPage.locator('.story img').evaluate(img=>new URL(img.currentSrc||img.src).searchParams.get('url')),historyImage,'returning to the public tab shows saved content without manual reload');
 await publicPage.close();await page.bringToFront();
 results.push('shared_phone_desktop_photo_and_public_focus_refresh');
 await page.reload();await page.locator('.editor-toggle').first().click();assert.equal(await page.locator('.image-field input[aria-label="URL image"]').inputValue(),historyImage);
 await page.goto(base+'/admin/parametres');
 results.push('editor_image_save_public_invalidation_and_reload');
 results.push('image_local_preview_cancel_storage_failure_rollback_retry_persistence');

 await page.goto(base+'/admin/lignes-reseau');const mapEditor=page.locator('#carte-reseau-voyageurs');
 assert.equal(await mapEditor.locator('input[name=key]').inputValue(),'voyageurs');
 await mapEditor.locator('input[type=file]').setInputFiles({name:'voyageurs.png',mimeType:'image/png',buffer:png});
 await mapEditor.getByRole('button',{name:'Enregistrer',exact:true}).click();await mapEditor.getByRole('status').filter({hasText:/^Enregistr\u00e9$/}).waitFor();
 const passengerMap=content.network_maps.find(row=>row.key==='voyageurs');assert.ok(passengerMap.data.image.includes('/uploads/'));assert.equal(passengerMap.is_active,true);
 await page.reload();assert.equal(await page.locator('#carte-reseau-voyageurs .image-field input[aria-label="URL image"]').inputValue(),passengerMap.data.image);
 assert.ok((await (await fetch(base+'/fr')).text()).includes(encodeURIComponent(passengerMap.data.image)));
 results.push('missing_passenger_map_create_upload_save_and_reload');
 results.push('fr_ar_persistence_rtl_hydration_editor_and_brand_controls');await page.goto(base+'/admin');
 // Expire only the cookie timestamp. The refresh token is still verified by fixture API.
 cookieParts.sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));const encoded=cookieParts.map(c=>c.value).join('');assert.ok(encoded.startsWith('base64-'));
 const stored=JSON.parse(Buffer.from(encoded.slice(7),'base64url'));stored.expires_at=Math.floor(Date.now()/1000)-10;const expired='base64-'+Buffer.from(JSON.stringify(stored)).toString('base64url');
 let offset=0;await context.addCookies(cookieParts.map((c,index)=>{const value=index===cookieParts.length-1?expired.slice(offset):expired.slice(offset,offset+c.value.length);offset+=c.value.length;return {...c,value}}));
 await page.reload();assert.equal(new URL(page.url()).pathname,'/admin');assert.ok(refreshCount>0);results.push('proxy_refresh_propagation');
 await page.goto(base+'/admin?section=site_settings');await page.locator('input[name=label_fr]').first().fill('SLKM — fixture sauvegarde');
 const initialWrites=writeCount;
 const saveResponse=page.waitForResponse(response=>response.request().method()==='POST'&&!!response.request().headers()['next-action']);
 await page.getByRole('button',{name:'Enregistrer',exact:true}).first().click();const saved=await saveResponse;assert.equal(writeCount,initialWrites+1);
 assert.equal(content.site_settings[0].data.logo,uploadedLogo,'saving general settings must preserve brand assets');
 const mutation=saved.request();const mutationHeaders=Object.fromEntries(Object.entries(mutation.headers()).filter(([key])=>!['cookie','host','content-length','connection'].includes(key)));
 const staff=await browser.newContext();const jar=new Map();const sdk=createServerClient(apiUrl,fixtureKey,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:values=>{for(const item of values)jar.set(item.name,item.value)}}});
 assert.equal((await sdk.auth.signInWithPassword({email:users.staff.email,password})).error,null);
 await staff.addCookies([...jar].map(([name,value])=>({name,value,url:base,httpOnly:true,sameSite:'Lax'})));
 const staffChecksBefore=roleChecks.filter(id=>id===users.staff.id).length;
 await staff.request.post(mutation.url(),{headers:mutationHeaders,data:mutation.postData()});assert.equal(writeCount,initialWrites+1);assert.ok(roleChecks.filter(id=>id===users.staff.id).length>staffChecksBefore,'mutation must run the UUID role guard, not merely fail CSRF');
 const guest=await browser.newContext();await guest.request.post(mutation.url(),{headers:mutationHeaders,data:mutation.postData()});assert.equal(writeCount,initialWrites+1);results.push('non_admin_and_guest_mutations_denied');await staff.close();await guest.close();
 await page.getByRole('button',{name:'Déconnexion',exact:true}).click();await page.waitForURL(url=>url.pathname==='/admin/login'&&!url.search);assert.equal((await context.cookies()).filter(c=>/^sb-.+-auth-token(?:\.\d+)?$/.test(c.name)).length,0);
 await page.goto(base+'/admin');await page.waitForURL(url=>url.pathname==='/admin/login');assert.equal(new URL(page.url()).pathname,'/admin/login');results.push('logout_and_anonymous_guard');
 // Explicitly discard the POST cookies before following its 303, like a browser
 // that cannot persist them. Browser route handlers skip redirect-chain requests.
 const lost=await browser.newContext({extraHTTPHeaders:trustedHeaders});
 const first=await lost.request.post(base+'/admin/login/submit',{headers:{Origin:base},form:{email:users.admin.email,password},maxRedirects:0});
 assert.equal(first.status(),303);assert.ok(first.headers().location.includes('login=complete'));
 await lost.clearCookies();const lostPage=await lost.newPage();await lostPage.goto(new URL(first.headers().location,base).toString());
 await lostPage.waitForURL(url=>url.pathname==='/admin/login'&&url.searchParams.get('error')==='session_lost');results.push('lost_session_after_redirect');await lost.close();

 const retry=await browser.newContext({extraHTTPHeaders:trustedHeaders});let retryOffset=0;
 await retry.addCookies(cookieParts.map((cookie,index)=>{const value=index===cookieParts.length-1?expired.slice(retryOffset):expired.slice(retryOffset,retryOffset+cookie.value.length);retryOffset+=cookie.value.length;return {...cookie,value}}));
 const retryPage=await retry.newPage(),beforeLoginRefresh=refreshCount;await retryPage.goto(base+'/admin/login');
 assert.equal(refreshCount,beforeLoginRefresh,'login page must not refresh a stale session');
 await retryPage.locator('#email').fill(users.admin.email);await retryPage.locator('#password').fill(password);await retryPage.getByRole('button',{name:'Se connecter / \u0627\u0644\u062f\u062e\u0648\u0644',exact:true}).click();await retryPage.waitForURL(url=>url.pathname==='/admin'&&!url.search);await retryPage.locator('.v2-stats').waitFor();await retry.close();results.push('stale_session_fresh_login');
 // Simulate unavailable identity in memory, then invalidate via an ordinary local action.
 await submit('admin');await page.waitForURL(url=>url.pathname==='/admin'&&!url.search);
 await page.goto(base+'/admin/notre-histoire');await page.locator('.editor-toggle').first().click();
 content.site_settings[0].is_active=false;
 await page.getByRole('button',{name:'Enregistrer',exact:true}).click();await page.getByRole('status').filter({hasText:/^Enregistr\u00e9$/}).waitFor();
 for(const locale of ['fr','ar']){const missing=await fetch(base+'/'+locale);assert.equal(missing.status,200);const html=await missing.text();assert.ok(!html.includes('application/ld+json'));assert.ok(html.includes('<h1'));}
 content.site_settings[0].is_active=true;results.push('missing_identity_fr_ar_recoverable_no_republication');
 assert.deepEqual(hydrationErrors,[],'admin pages must hydrate without mismatches in both languages');
 assert.ok(!output.includes(password)&&!output.includes(fixtureKey)&&!output.includes(serviceKey)&&!output.includes(rateSecret),'auth logs must exclude test password and keys');
 await mkdir('artifacts',{recursive:true});await writeFile('artifacts/auth-browser-results.json',JSON.stringify({simulation:true,realSupabaseLoginTested:false,origin:base,localhost3000:port===3000,results},null,2));
 console.log(`PASS: isolated simulated Auth/SSR flow on localhost:${port}; ${results.join(', ')}. No real Supabase login tested.`);
}catch(error){console.log('Fixture auth probes: '+JSON.stringify(authProbes));await mkdir('artifacts',{recursive:true});await writeFile('artifacts/auth-test-failure.log',output.replaceAll(password,'[REDACTED]').replaceAll(fixtureKey,'[REDACTED]').replaceAll(serviceKey,'[REDACTED]').replaceAll(rateSecret,'[REDACTED]'));throw error}
finally{if(browser)await browser.close();child.kill();await new Promise(resolve=>api.close(resolve))}


