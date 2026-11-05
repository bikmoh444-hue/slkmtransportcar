import Link from 'next/link';
import { configured } from '@/lib/supabase';
import {publicLoginMessage} from '@/lib/auth/errors';
import {LoginForm} from '@/components/login-form';
export const dynamic='force-dynamic';
export const metadata = { title: 'SLKM — Administration', robots: { index: false, follow: false } };
export default async function Login({ searchParams }: {
    searchParams: Promise<{
        error?: string;
    }>;
}) {
    const { error } = await searchParams;
    const message=publicLoginMessage(error);
    return <main className="login">
    <Link href="/fr">← SLKM</Link>
    <h1>Administration <span lang="ar">الإدارة</span>
    </h1>
    <p>Accès réservé aux administrateurs.<br />
    <span lang="ar">الدخول مخصص للمسؤولين.</span>
    </p>{!configured() ? <p className="form-note">{publicLoginMessage('config').fr}<br />{publicLoginMessage('config').ar}</p> : <LoginForm message={error?message:undefined}>
        <label htmlFor="email">Email / البريد الإلكتروني</label>
        <input id="email" name="email" type="email" autoComplete="username" required/>
        <label htmlFor="password">Mot de passe / كلمة المرور</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required maxLength={1024}/>
        </LoginForm>}</main>;
}
