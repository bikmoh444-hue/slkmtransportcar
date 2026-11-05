 'use client';
import {useEffect,useState,useRef,useId} from 'react';
import {Media} from './media';
import {useAdminLanguage} from './admin-language';
export function ImageField({value,file,onFile,onValue,disabled,purpose,id}:{value:string;file?:File;onFile:(file?:File)=>void;onValue:(value:string)=>void;disabled:boolean;purpose:string;id?:string}){
 const {t}=useAdminLanguage();const preview=useRef<HTMLImageElement>(null);const [error,setError]=useState('');const generatedId=useId();const fieldId=id||generatedId;
 useEffect(()=>{if(!file)return;const url=URL.createObjectURL(file);if(preview.current)preview.current.src=url;return()=>URL.revokeObjectURL(url)},[file]);
 // Local blob previews cannot use the Next.js image optimizer.
 // eslint-disable-next-line @next/next/no-img-element
 return <div className="image-field" id={`brand-${fieldId}`}><div className="field-media-preview">{file?<img ref={preview} alt={t('Aperçu du brouillon')} style={{width:'100%',height:200,objectFit:'contain'}}/>:<Media src={value} alt={purpose} contain/>}</div><input aria-label={t('Choisir un fichier')} type="file" disabled={disabled} accept="image/jpeg,image/png,image/webp,image/avif" onChange={e=>{const selected=e.target.files?.[0];if(selected){if(!['image/jpeg','image/png','image/webp','image/avif'].includes(selected.type)||selected.size>8388608||!selected.size){setError(t('Image JPEG, PNG, WebP ou AVIF : 8 Mo maximum.'))}else{setError('');onFile(selected)}}e.target.value=''}}/><small>{t('JPEG, PNG, WebP, AVIF : 8 Mo maximum. Transparence conservée.')} {purpose==='favicon'?t('Favicon converti en PNG 128 × 128.'):''}</small>{file&&<p>{file.name} — {t('Brouillon non enregistré')} <button type="button" disabled={disabled} onClick={()=>onFile(undefined)}>{t('Annuler')}</button></p>}<input id={`url-${fieldId}`} aria-label={t('URL image')} value={value} disabled={disabled} onChange={e=>{onFile(undefined);onValue(e.target.value)}}/>{(value||file)&&<button type="button" className="button" disabled={disabled} onClick={()=>{onFile(undefined);onValue('')}}>{t('Retirer l’image')}</button>}{error&&<p role="alert">{error}</p>}</div>
}
