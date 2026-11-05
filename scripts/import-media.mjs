import {readFile,access} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {createClient} from '@supabase/supabase-js';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw new Error('Variables Supabase serveur manquantes');
const db=createClient(url,key,{auth:{persistSession:false}});
const manifest=JSON.parse(await readFile('media-manifest.json','utf8'));
let missing=0;
for(const item of manifest){const file=resolve(item.file);if(!file.startsWith(resolve('media-source')+'\\')&&!file.startsWith(resolve('media-source')+'/'))throw new Error('Chemin hors media-source');try{await access(file)}catch{console.warn(`Manquant : ${item.file}`);missing++;continue}
 const {data:existing,error:existingError}=await db.from('media_assets').select('*').eq('seed_key',item.key).maybeSingle();if(existingError)throw existingError;
 let asset=existing;
 if(!asset){const source=await readFile(file);if(source.length>8388608)throw new Error(`Fichier trop volumineux : ${item.file}`);const buffer=await sharp(source,{limitInputPixels:40000000}).rotate().webp({quality:90}).toBuffer();const meta=await sharp(buffer).metadata();const digest=createHash('sha256').update(buffer).digest('hex').slice(0,16);const path=item.destination.replace('.webp',`-${digest}.webp`);const {error:uploadError}=await db.storage.from('slkm-media').upload(path,buffer,{contentType:'image/webp',upsert:false});if(uploadError&&!/already exists|duplicate/i.test(uploadError.message))throw uploadError;const {data,error}=await db.from('media_assets').insert({seed_key:item.key,storage_path:path,mime:'image/webp',size:buffer.length,width:meta.width,height:meta.height,alt_fr:item.alt_fr,alt_ar:item.alt_ar}).select().single();if(error)throw error;asset=data;}
 const publicUrl=db.storage.from('slkm-media').getPublicUrl(asset.storage_path).data.publicUrl;
 const {error:attachError}=await db.rpc('attach_seed_media',{p_seed_key:item.key,p_media_id:asset.id,p_url:publicUrl});if(attachError)throw attachError;
 console.log(`Prêt : ${item.key}`);
}
if(missing){console.warn(`${missing} fichier(s) manquant(s). Aucun média fictif créé.`);process.exitCode=2;}
