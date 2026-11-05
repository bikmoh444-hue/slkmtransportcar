import test from 'node:test';
import assert from 'node:assert/strict';
import type {SupabaseClient} from '@supabase/supabase-js';
import {supabaseConfig} from '../lib/auth/config.ts';
import {AdminAccessError,authDiagnostic,classifyAuthError,publicLoginMessage} from '../lib/auth/errors.ts';
import {authenticateAdmin,authorizeAdmin} from '../lib/auth/access.ts';
import {authCookieOptions,serverCookieAdapter} from '../lib/auth/cookies.ts';
import {loginCredentials} from '../lib/auth/credentials.ts';
const id='11111111-1111-4111-8111-111111111111';
function fake({signInError=null,userError=null,roleError=null,member=true,session=true}:{signInError?:unknown;userError?:unknown;roleError?:unknown;member?:boolean;session?:boolean}={}){
 const queries:unknown[][]=[];
 const db={auth:{signInWithPassword:async()=>({data:{user:{id},session:session?{}:null},error:signInError}),getUser:async()=>({data:{user:{id}},error:userError})},from:(table:string)=>({select:(column:string)=>({eq:(key:string,value:string)=>({maybeSingle:async()=>{queries.push([table,column,key,value]);return {data:member?{user_id:id}:null,error:roleError}}})})})} as unknown as SupabaseClient;
 return {db,queries};
}
test('configuration distinguishes missing, private keys and a mismatched project without exposing keys',()=>{
 const jwt=(role:string,ref:string)=>`e30.${Buffer.from(JSON.stringify({role,ref})).toString('base64url')}.test`;
 assert.deepEqual(supabaseConfig({}),{ok:false,reason:'missing'});
 assert.deepEqual(supabaseConfig({NEXT_PUBLIC_SUPABASE_URL:'bad',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'x'}),{ok:false,reason:'url'});
 assert.deepEqual(supabaseConfig({NEXT_PUBLIC_SUPABASE_URL:'https://one.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:jwt('anon','two')}),{ok:false,reason:'project_mismatch'});
 assert.deepEqual(supabaseConfig({NEXT_PUBLIC_SUPABASE_URL:'https://one.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:jwt('service_role','one')}),{ok:false,reason:'private_key'});
 assert.equal(supabaseConfig({NEXT_PUBLIC_SUPABASE_URL:'https://one.supabase.co',NEXT_PUBLIC_SUPABASE_ANON_KEY:jwt('anon','one')}).ok,true);
});
test('login accepts existing short passwords and normalizes only the email',()=>{
 const value=loginCredentials.parse({email:' SLKMTRANSPORT@gmail.com ',password:' abc '});
 assert.equal(value.email,'slkmtransport@gmail.com');assert.equal(value.password,' abc ');
 assert.equal(loginCredentials.safeParse({email:value.email,password:''}).success,false);
});
test('provider failures and safe diagnostics preserve their cause',()=>{
 assert.equal(classifyAuthError({code:'invalid_credentials',status:400},'sign_in').code,'credentials');
 assert.equal(classifyAuthError({code:'email_not_confirmed',status:400},'sign_in').code,'unconfirmed');
 assert.equal(classifyAuthError({status:401},'sign_in').code,'config');
 assert.equal(classifyAuthError({name:'AuthRetryableFetchError'},'sign_in').code,'service_unavailable');
 const report=JSON.stringify(authDiagnostic(new AdminAccessError('role_check','admin_role',{code:'42P17',status:500,message:'secret password token',password:'private',access_token:'private'})));
 assert.match(report,/42P17/);assert.doesNotMatch(report,/secret|password|token|private/);
 assert.doesNotMatch(JSON.stringify(new AdminAccessError('role_check','admin_role',{code:'42P17',message:'private password token'})),/private|password|token/);
 assert.ok(publicLoginMessage('forbidden').fr.includes('authentifié'));assert.ok(publicLoginMessage('unconfirmed').ar);
});
test('authorization uses the verified Auth UUID and distinguishes missing role from query or RLS errors',async()=>{
 const good=fake();await authenticateAdmin(good.db,{email:'test@example.invalid',password:'generated-in-test'});
 assert.deepEqual(good.queries,[['admin_users','user_id','user_id',id]]);
 await assert.rejects(()=>authorizeAdmin(fake({member:false}).db),(e:unknown)=>e instanceof AdminAccessError&&e.code==='forbidden');
 for(const code of ['42501','42P17','PGRST205'])await assert.rejects(()=>authorizeAdmin(fake({roleError:{code}}).db),(e:unknown)=>e instanceof AdminAccessError&&e.code==='role_check'&&authDiagnostic(e).providerCode===code);
 await assert.rejects(()=>authenticateAdmin(fake({session:false}).db,{email:'test@example.invalid',password:'test'}),(e:unknown)=>e instanceof AdminAccessError&&e.code==='session_lost');
 await assert.rejects(()=>authenticateAdmin(fake({signInError:{code:'invalid_credentials'}}).db,{email:'test@example.invalid',password:'test'}),(e:unknown)=>e instanceof AdminAccessError&&e.code==='credentials');
});
test('SSR preserves chunked cookies and makes write failures explicit; localhost cookies work over HTTP',async()=>{
 const values=new Map<string,string>();
 const adapter=serverCookieAdapter({getAll:()=>[...values].map(([name,value])=>({name,value})),set:(name,value)=>values.set(name,value)},true);
 await adapter.methods.setAll!([{name:'sb-test-auth-token.0',value:'first',options:{}},{name:'sb-test-auth-token.1',value:'second',options:{}}],{});
 assert.equal((await adapter.methods.getAll())!.length,2);adapter.assertWritable();
 const broken=serverCookieAdapter({getAll:()=>[],set:()=>{throw new Error('read only')}},true);
 assert.throws(()=>broken.methods.setAll!([{name:'a',value:'b',options:{}}],{}),AdminAccessError);assert.throws(()=>broken.assertWritable(),AdminAccessError);
 assert.equal(serverCookieAdapter({getAll:()=>[],set:()=>{}},false).methods.setAll,undefined);
 assert.equal(authCookieOptions('localhost:3000',false).secure,false);assert.equal(authCookieOptions('127.0.0.1:3000',false).secure,false);
 assert.equal(authCookieOptions('slkm.example',true).secure,true);assert.equal(authCookieOptions('localhost:3000',false).domain,undefined);assert.equal(authCookieOptions('localhost:3000',false).sameSite,'lax');
});
