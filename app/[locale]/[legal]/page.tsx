import { notFound } from 'next/navigation';
export default async function Legal({ params }: {
    params: Promise<{
        locale: string;
        legal: string;
    }>;
}) {
    const { locale, legal } = await params;
    if (!['fr', 'ar'].includes(locale) || !['confidentialite', 'mentions-legales'].includes(legal))
        notFound();
    const ar = locale === 'ar';
    return <main className="container legal">
    <a href={`/${locale}`}>← SLKM</a>
    <h1>{legal === 'confidentialite' ? (ar ? 'سياسة الخصوصية' : 'Confidentialité') : (ar ? 'البيانات القانونية' : 'Mentions légales')}</h1>
    <p>{ar ? 'محتوى يحتاج إلى استكمال قبل النشر: الهوية القانونية للمسؤول عن الموقع، عنوانه، المستضيف، ومدة الاحتفاظ بالبيانات وحقوق المستخدمين.' : 'Contenu à compléter avant publication : identité juridique du responsable du site, adresse, hébergeur, durée de conservation et modalités d’exercice des droits.'}</p>
    <p>{ar ? 'تُسجل الشكاوى بشكل خاص لمعالجتها. للاستفسار:' : 'Les réclamations sont enregistrées de manière privée pour leur traitement. Contact :'} <a href="mailto:slkmtransport@gmail.com">slkmtransport@gmail.com</a>.</p>
    </main>;
}
