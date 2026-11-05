'use server';
import { redirect } from 'next/navigation';
import { updateTag } from 'next/cache';
import { headers } from 'next/headers';
import { sessionContext, requireAdmin } from '@/lib/supabase';
import {AdminAccessError,logAuthFailure} from '@/lib/auth/errors';
import { tables } from '@/lib/model';
import { rowSchema } from '@/lib/validation';
import {themeData} from '@/lib/theme';
import { z } from 'zod';
import {identityWriteError,settingsWriteError} from '@/lib/security/settings';
export async function logout(){
 let failure:AdminAccessError|undefined;
 try{const context=await sessionContext({writable:true});const {error}=await context.db.auth.signOut({scope:'local'});context.assertCookiesWritten();if(error)throw new AdminAccessError('logout_failed','logout',error)}
 catch(error){failure=error instanceof AdminAccessError?error:new AdminAccessError('logout_failed','logout',error);logAuthFailure(failure)}
 redirect(failure?`/admin/login?error=${failure.code}`:'/admin/login');
}
type AdminDb=Awaited<ReturnType<typeof requireAdmin>>;
export async function saveRow(table:string,value:unknown){return saveRowFor(await requireAdmin({writable:true}),table,value)}
async function saveRowFor(db:AdminDb,table: string, value: unknown) { if (!(tables as readonly string[]).includes(table))
    return { error: 'Table invalide / جدول غير صالح' }; const parsed = rowSchema.safeParse(value); if (!parsed.success)
    return { error: parsed.error.issues.map(x => x.message).join(', ') };
 if(table==='site_settings'){
  let query=db.from(table).select('id,key,data,is_active');
  query=parsed.data.id?query.eq('id',parsed.data.id):query.eq('key',parsed.data.key);
  const {data:existing,error:readError}=await query.maybeSingle();
  if(readError)return {error:'Sauvegarde impossible'};
  const identityError=identityWriteError(parsed.data.key,parsed.data.is_active,existing||undefined);
  if(identityError)return {error:identityError};
  const settingsError=settingsWriteError(parsed.data.data,existing?.data||{});
  if(settingsError)return {error:settingsError};
  parsed.data.data=themeData({...existing?.data,...parsed.data.data});
 }
 const {origin_city_id,destination_city_id,city_id,...row}=parsed.data; const { error } = await db.from(table).upsert({...row,...(table==='transport_lines'?{origin_city_id,destination_city_id}:table==='agencies'?{city_id}:{})}); if (error)
    return { error: 'Sauvegarde impossible / تعذر الحفظ' }; updateTag('content'); return { ok: true }; }
export async function deleteRow(table: string, id: string) { const db = await requireAdmin({writable:true}); if (!(tables as readonly string[]).includes(table) || table === 'site_settings' || !z.uuid().safeParse(id).success)
    return { error: 'Action invalide / إجراء غير صالح' }; const { data,error } = await db.from(table).delete().eq('id', id).select('id').maybeSingle(); if (error||!data)
    return { error: 'Suppression impossible / تعذر الحذف' }; updateTag('content'); return { ok: true }; }
export async function updateComplaint(id: string, status: string, notes: string) { const db = await requireAdmin({writable:true}); if (!z.uuid().safeParse(id).success || !z.enum(['new', 'in_progress', 'resolved', 'archived']).safeParse(status).success || !z.string().max(5000).safeParse(notes).success)
    return { error: 'Données invalides / بيانات غير صالحة' }; const { data,error } = await db.from('complaints').update({ status, internal_notes: notes }).eq('id', id).select('id').maybeSingle(); return error||!data ? { error: 'Erreur / خطأ' } : { ok: true }; }
export async function uploadMedia(form:FormData){return uploadMediaFor(await requireAdmin({writable:true}),form)}
async function uploadMediaFor(db:AdminDb,form: FormData) { const file = form.get('file'); if (!(file instanceof File) || !file.size || file.size > 8 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type))
    return { error: 'Image raster requise, 8 Mo maximum / صورة بحد أقصى 8 ميغابايت' }; let prepared; try {
    const {prepareRaster}=await import('@/lib/security/media');
    prepared=await prepareRaster(file,form.get('purpose'));
}
catch {
    return { error: 'Contenu image invalide / صورة غير صالحة' };
} const {buffer,info,format,mime}=prepared; const path = `uploads/${crypto.randomUUID()}.${format}`; const { error } = await db.storage.from('slkm-media').upload(path, buffer, { contentType: mime, upsert: false }); if (error) {
    console.error('[slkm-media]', {stage:'storage_upload',status:error.statusCode});
    return { error: error.message.toLowerCase().includes('bucket') ? 'Le bucket slkm-media est absent ou inaccessible. Vérifiez Storage.' : error.statusCode==='403' ? 'Upload refusé : vérifiez les droits Storage de votre compte administrateur.' : 'Téléversement impossible. Vérifiez votre connexion puis réessayez.' };
} const { data, error: insertError } = await db.from('media_assets').insert({ storage_path: path, mime, size: buffer.length, width: info.width, height: info.height, alt_fr: String(form.get('alt_fr') || '').slice(0, 300), alt_ar: String(form.get('alt_ar') || '').slice(0, 300) }).select().single(); if (insertError) {
    await db.storage.from('slkm-media').remove([path]);
    console.error('[slkm-media]',{stage:'asset_reference',code:insertError.code});
    return { error: 'Erreur de référence / خطأ في المرجع' };
} const url = db.storage.from('slkm-media').getPublicUrl(path).data.publicUrl; void await headers(); return { ok: true, url, id: data.id, path }; }
export async function changePassword(form:FormData){
 const db=await requireAdmin({writable:true});
 const current=String(form.get('current')||''),password=String(form.get('password')||'');
 if(password.length<12||password.length>128||current.length>128)return {error:'Utilisez un mot de passe de 12 à 128 caractères.'};
 const {data:{user}}=await db.auth.getUser();if(!user?.email)return {error:'Session indisponible.'};
 const verified=await db.auth.signInWithPassword({email:user.email,password:current});if(verified.error)return {error:'Le mot de passe actuel est incorrect.'};
 const {error}=await db.auth.updateUser({password});return error?{error:'Modification impossible. Réessayez après une nouvelle connexion.'}:{ok:true};
}
export async function saveIdentityAssets(value:unknown){return saveIdentityAssetsFor(await requireAdmin({writable:true}),value)}
async function saveIdentityAssetsFor(db:AdminDb,value:unknown){
 const parsed=z.object({logo:z.string().max(500),footer_logo:z.string().max(500),favicon:z.string().max(500),og_image:z.string().max(500)}).strict().safeParse(value);
 if(!parsed.success)return {error:'Données invalides'};
 const {data:row,error:readError}=await db.from('site_settings').select('*').eq('key','identity').single();
 if(readError||!row)return {error:'Sauvegarde impossible'};
 const settingsError=settingsWriteError({...row.data,...parsed.data},row.data);if(settingsError)return {error:settingsError};
 const checked=rowSchema.safeParse({...row,data:{...row.data,...parsed.data}});
 if(!checked.success)return {error:checked.error.issues.map(x=>x.message).join(', ')};
 const {data:updated,error}=await db.from('site_settings').update({data:checked.data.data}).eq('id',row.id).select('id').maybeSingle();
 if(error||!updated)return {error:'Sauvegarde impossible'};
 updateTag('content');return {ok:true};
}

const imageFields=new Set(['image','mobile_image','logo','footer_logo','favicon','og_image']);
async function withUploads(db:AdminDb,value:Record<string,unknown>,files:FormData,save:(data:Record<string,unknown>)=>Promise<{error?:string;ok?:boolean}>):Promise<{error?:string;ok?:boolean;data?:Record<string,unknown>}>{
 const data={...value};const created:{id:string;path:string}[]=[];let committed=false;
 try{
  for(const [key,file] of files.entries()){
   if(!imageFields.has(key)||!(file instanceof File))return {error:'Champ image invalide'};
   const form=new FormData();form.set('file',file);form.set('purpose',key);const result=await uploadMediaFor(db,form);
   if(!result.ok||!result.url||!result.id)return {error:result.error||'Upload impossible'};
   created.push({id:result.id,path:result.path!});data[key]=result.url;
  }
  const result=await save(data);committed=!!result.ok;return {...result,data:committed?data:undefined};
 }catch{return {error:'Sauvegarde impossible. Vos modifications restent dans le formulaire.'}}
 finally{if(!committed)for(const asset of created){const removed=await db.from('media_assets').delete().eq('id',asset.id);if(!removed.error){const cleanup=await db.storage.from('slkm-media').remove([asset.path]);if(cleanup.error)console.error('media_cleanup_failed',asset.id)}}}
}
export async function saveWithMedia(table:string,value:unknown,files:FormData):Promise<{error?:string;ok?:boolean;data?:Record<string,unknown>}>{
 const db=await requireAdmin({writable:true});if(!(tables as readonly string[]).includes(table))return {error:'Table invalide'};
 const parsed=rowSchema.safeParse(value);if(!parsed.success)return {error:parsed.error.issues.map(x=>x.message).join(', ')};
 if(table==='site_settings'){const invalid=identityWriteError(parsed.data.key,parsed.data.is_active);if(invalid)return {error:invalid}}
 return withUploads(db,parsed.data.data,files,data=>saveRowFor(db,table,{...parsed.data,data}));
}
export async function saveBrandWithMedia(value:Record<string,string>,files:FormData){
 const db=await requireAdmin({writable:true});const result=await withUploads(db,value,files,data=>saveIdentityAssetsFor(db,data));return {...result,data:result.data as Record<string,string>|undefined};
}
