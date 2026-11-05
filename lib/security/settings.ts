import {z} from 'zod';
import type {Content,RecordData} from '../model.ts';

const short=z.string().max(500),text=z.string().max(5000),color=z.string().regex(/^#[0-9a-f]{6}$/i);
export const publicSettingsSchema=z.object({
  logo:short.optional(),footer_logo:short.optional(),favicon:short.optional(),og_image:short.optional(),
  phone:short.optional(),mobile:short.optional(),email:z.union([z.email(),z.literal('')]).optional(),whatsapp:short.optional(),
  facebook:short.optional(),instagram:short.optional(),studio_url:short.optional(),maps_url:short.optional(),
  address_fr:text.optional(),address_ar:text.optional(),footer_fr:text.optional(),footer_ar:text.optional(),hours_fr:text.optional(),hours_ar:text.optional(),
  blue:color.optional(),logo_blue:color.optional(),deep_blue:color.optional(),orange:color.optional(),orange_hover:color.optional(),
  background:color.optional(),surface:color.optional(),border:color.optional(),text:color.optional(),muted:color.optional(),
  font:z.enum(['jakarta','system']).optional(),theme_version:z.number().int().optional(),
});
const publicKeys=new Set(Object.keys(publicSettingsSchema.shape));
function containsSensitiveKey(value:unknown):boolean {
  if(!value||typeof value!=='object')return false;
  return Object.entries(value).some(([key,item])=>/password|secret|token|api[_-]?key|service[_-]?role|credential|private[_-]?key|connection[_-]?string/i.test(key)||containsSensitiveKey(item));
}

export function settingsWriteError(data:Record<string,unknown>,previous:Record<string,unknown>={}):string|undefined {
  if(containsSensitiveKey(data))return 'Paramètres publics invalides / إعدادات عامة غير صالحة';
  for(const [key,value]of Object.entries(data)) {
    // Keep unchanged legacy fields stored, but never publish or introduce new internal fields.
    if(!publicKeys.has(key)&&(!Object.hasOwn(previous,key)||JSON.stringify(value)!==JSON.stringify(previous[key])))return 'Paramètres publics invalides / إعدادات عامة غير صالحة';
  }
  if(!publicSettingsSchema.safeParse(data).success)return 'Paramètres publics invalides / إعدادات عامة غير صالحة';
}

export function publicSettingsData(data:Record<string,unknown>):Record<string,unknown> {
  return Object.fromEntries(Object.entries(data).filter(([key])=>publicKeys.has(key)));
}
export function publicIdentity(content:Content):RecordData|undefined {
  const row=content.site_settings?.find(row=>row.key==='identity'&&row.is_active);
  return row?{...row,data:publicSettingsData(row.data)}:undefined;
}
export function identityWriteError(key:string,active:boolean,previous?:Pick<RecordData,'key'>):string|undefined {
  if((previous?.key==='identity'&&key!=='identity')||(key==='identity'&&!active))return 'L’identité globale doit rester publiée / يجب إبقاء الهوية العامة منشورة';
}
