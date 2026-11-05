'use client';
import { useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { Locale } from '@/lib/model';
export function ComplaintForm({ locale, available }: {
    locale: Locale;
    available: boolean;
}) {
    const ar = locale === 'ar';
    const [busy, setBusy] = useState(false);
    const sending = useRef(false);
    const [result, setResult] = useState('');
    const [success, setSuccess] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const copy = ar ? {
        heading: 'إرسال شكوى', eyebrow: 'نحن نصغي إليكم', name: 'الاسم الكامل', email: 'البريد الإلكتروني', message: 'الرسالة',
        nameError: 'يرجى إدخال الاسم الكامل (من حرفين إلى 120 حرفاً).', emailError: 'يرجى إدخال بريد إلكتروني صالح.', messageError: 'يرجى كتابة رسالة من 10 إلى 5000 حرف.',
        unavailable: 'النموذج غير متاح أثناء المعاينة أو قبل إكمال الإعداد. يرجى الاتصال بنا مباشرة.',
        failure: 'تعذر تسجيل الشكوى. يرجى المحاولة لاحقاً أو الاتصال بنا.', limited: 'تم بلوغ الحد الأقصى للمحاولات. يرجى المحاولة لاحقاً.',
        saved: 'تم تسجيل شكواكم بنجاح.', send: 'إرسال الشكوى', sending: 'جارٍ التسجيل…', privacy: 'تُستخدم بياناتكم لمعالجة شكواكم فقط.'
    } : {
        heading: 'Une réclamation ?', eyebrow: 'À VOTRE ÉCOUTE', name: 'Nom complet', email: 'Email', message: 'Message',
        nameError: 'Renseignez un nom complet de 2 à 120 caractères.', emailError: 'Renseignez une adresse email valide.', messageError: 'Écrivez un message de 10 à 5 000 caractères.',
        unavailable: 'Formulaire indisponible en prévisualisation ou avant configuration complète. Contactez-nous directement.',
        failure: 'L’enregistrement a échoué. Réessayez plus tard ou contactez-nous.', limited: 'Le nombre de tentatives est atteint. Réessayez plus tard.',
        saved: 'Votre réclamation a bien été enregistrée.', send: 'Envoyer ma réclamation', sending: 'Enregistrement…', privacy: 'Vos données sont utilisées uniquement pour traiter votre réclamation.'
    };
    return <form className="complaint" noValidate onSubmit={async (event) => {
            event.preventDefault();
            if (sending.current || !available)
                return;
            const form = event.currentTarget;
            const data = new FormData(form);
            const values = {
                full_name: String(data.get('full_name') || '').trim(),
                email: String(data.get('email') || '').trim(),
                message: String(data.get('message') || '').trim(),
                locale,
                website: String(data.get('website') || '')
            };
            setResult('');
            setSuccess(false);
            const next: Record<string, string> = {};
            if (values.full_name.length < 2 || values.full_name.length > 120)
                next.full_name = copy.nameError;
            if (values.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
                next.email = copy.emailError;
            if (values.message.length < 10 || values.message.length > 5000)
                next.message = copy.messageError;
            if (values.website)
                next.website = copy.messageError;
            if (Object.keys(next).length) {
                setErrors(next);
                const first = form.elements.namedItem(Object.keys(next)[0]);
                if (first instanceof HTMLElement)
                    first.focus();
                return;
            }
            setErrors({});
            sending.current = true;
            setBusy(true);
            try {
                const response = await fetch('/api/complaints', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
                if (!response.ok) {
                    setResult(response.status === 429 ? copy.limited : copy.failure);
                    return;
                }
                setSuccess(true);
                setResult(copy.saved);
                form.reset();
            }
            catch {
                setResult(copy.failure);
            }
            finally {
                sending.current = false;
                setBusy(false);
            }
        }}>
  <p className="eyebrow">{copy.eyebrow}</p>
    <h3>{copy.heading}</h3>
  <label htmlFor="full_name">{copy.name}</label>
  <input id="full_name" name="full_name" autoComplete="name" required minLength={2} maxLength={120} aria-invalid={!!errors.full_name} aria-describedby={errors.full_name ? 'full_name-error' : undefined}/>
  {errors.full_name && <p id="full_name-error" className="error">{errors.full_name}</p>}
  <label htmlFor="email">{copy.email}</label>
  <input id="email" name="email" type="email" dir="ltr" autoComplete="email" required maxLength={254} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined}/>
  {errors.email && <p id="email-error" className="error">{errors.email}</p>}
  <label htmlFor="message">{copy.message}</label>
  <textarea id="message" name="message" required minLength={10} maxLength={5000} rows={4} aria-invalid={!!errors.message} aria-describedby={errors.message ? 'message-error' : undefined}/>
  {errors.message && <p id="message-error" className="error">{errors.message}</p>}
  <div className="honeypot" aria-hidden="true">
    <label>Website<input name="website" tabIndex={-1} autoComplete="off"/>
    </label>
    </div>
  {!available && <p className="form-note">{copy.unavailable}</p>}
  <button className="button primary" type="submit" disabled={busy || !available}>{busy ? copy.sending : copy.send}<ArrowRight size={17}/>
    </button>
  <p role="status" className={success ? 'success' : 'error'}>{result}</p>
    <small>{copy.privacy}</small>
 </form>;
}
