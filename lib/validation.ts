import 'server-only';
import { z } from 'zod';
function localStorageImage(value:string) {
    try {const url=new URL(value);return url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)&&url.pathname.startsWith('/storage/v1/object/public/slkm-media/')&&!url.username&&!url.password;}
    catch {return false;}
}
export const safeLink = z.string().max(500).refine(v => !v || /^#[a-z][a-z0-9-]*$/i.test(v) || /^\/(fr|ar)(\/|#|$)/.test(v) || /^https:\/\/[^\s<>]+$/i.test(v) || /^tel:\+?[0-9]+$/.test(v) || /^mailto:[^\s<>@]+@[^\s<>@]+$/.test(v), 'Lien invalide');
export const complaintSchema = z.object({ full_name: z.string().trim().min(2).max(120), email: z.email().max(254), message: z.string().trim().min(10).max(5000), locale: z.enum(['fr', 'ar']), website: z.string().max(0) }).strict();
export const rowSchema = z.object({ id: z.string().uuid().optional(), origin_city_id: z.uuid().nullable().optional(), destination_city_id: z.uuid().nullable().optional(), city_id: z.uuid().nullable().optional(), key: z.string().regex(/^[a-z][a-z0-9_-]{0,79}$/), label_fr: z.string().max(500), label_ar: z.string().max(500), sort_order: z.number().int().min(0).max(10000), is_active: z.boolean(), data: z.record(z.string(), z.unknown()) }).superRefine((row, ctx) => { if (row.is_active && (!row.label_fr.trim() || !row.label_ar.trim()))
    ctx.addIssue({ code: 'custom', message: 'Titres FR et AR requis / العنوانان مطلوبان', path: ['label_fr'] }); if (row.data.seats != null && (!Number.isInteger(row.data.seats) || Number(row.data.seats) < 1 || Number(row.data.seats) > 100))
    ctx.addIssue({ code: 'custom', message: 'Capacité invalide / سعة غير صالحة', path: ['data', 'seats'] }); if (row.data.icon && !['bus', 'package', 'users', 'compass', 'truck'].includes(String(row.data.icon)))
    ctx.addIssue({ code: 'custom', message: 'Icône invalide / أيقونة غير صالحة', path: ['data', 'icon'] }); if (JSON.stringify(row.data).length > 24000)
    ctx.addIssue({ code: 'custom', message: 'Contenu trop long', path: ['data'] }); for (const [k, v] of Object.entries(row.data)) {if(k==='agency_ids'&&(!Array.isArray(v)||v.length>100||v.some(id=>!z.uuid().safeParse(id).success)))ctx.addIssue({code:'custom',message:'Agences invalides',path:['data',k]});if(/^(values|milestones|features)_(fr|ar)$/.test(k)&&(!Array.isArray(v)||v.length>50||v.some(x=>typeof x!=='string'||x.length>500)))ctx.addIssue({code:'custom',message:'Liste de textes invalide / قائمة نصوص غير صالحة',path:['data',k]});
    if (typeof v === 'string') {
        if (/href|url|facebook|instagram|target|whatsapp/.test(k) && !safeLink.safeParse(v).success)
            ctx.addIssue({ code: 'custom', message: `Lien invalide: ${k}`, path: ['data', k] });
        if (/image|logo|favicon/.test(k) && k!=='logo_blue' && v && !/^\/media\/[a-z0-9/_.-]+$/i.test(v) && !/^https:\/\/[^\s<>]+$/.test(v) && !localStorageImage(v))
            ctx.addIssue({ code: 'custom', message: 'Média invalide', path: ['data', k] });
        if (['blue','logo_blue','deep_blue','orange','orange_hover','background','surface','border','text','muted'].includes(k) && !/^#[0-9a-f]{6}$/i.test(v))
            ctx.addIssue({ code: 'custom', message: 'Couleur invalide', path: ['data', k] });
    }
    if (k === 'font' && !['jakarta', 'system'].includes(String(v)))
        ctx.addIssue({ code: 'custom', message: 'Police invalide', path: ['data', k] });
} });
